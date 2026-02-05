'use client'

// ===========================================
// Explore Page - Power User View
// Unified Capital Flow + Analyze + Signals
// ===========================================

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Globe,
  BarChart3,
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  ChevronRight,
  Loader2,
  Search,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Layers,
  LineChart,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { authFetch } from '@/lib/api'
import { getCoinIcon, FALLBACK_COIN_ICON } from '@/lib/coin-icons'

// ===========================================
// Types
// ===========================================

interface GlobalLiquidity {
  fedBalanceSheet: { value: number; change30d: number; trend: string }
  m2MoneySupply: { value: number; change30d: number; yoyGrowth: number }
  dxy: { value: number; change7d: number; trend: string }
  vix: { value: number; level: string }
  netLiquidity?: number
  bias?: string
}

interface MarketFlow {
  market: string
  flow7d: number
  flow30d: number
  flowVelocity: number
  phase: string
  daysInPhase: number
  rotationSignal: string | null
  sectors?: Array<{ name: string; flow7d: number; trending: string }>
}

interface SuggestedAsset {
  symbol: string
  name: string
  market: string
  riskLevel?: string
  reason?: string
}

interface Recommendation {
  action: string
  direction: string
  primaryMarket: string
  confidence: number
  reason: string
  sectors?: string[]
  suggestedAssets?: SuggestedAsset[]
}

interface CapitalFlowData {
  globalLiquidity: GlobalLiquidity
  markets: MarketFlow[]
  recommendation?: Recommendation
  sellRecommendation?: Recommendation
}

interface TopCoin {
  symbol: string
  totalScore: number
  verdict: string
  direction: string
  analysisId: string
  change24h?: number
  method?: string
}

type TabType = 'flow' | 'analyze' | 'signals'

// ===========================================
// Components
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
  )
}

function GradientOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/3 -left-20 w-72 h-72 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute -bottom-20 right-1/4 w-80 h-80 bg-violet-500/20 dark:bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  )
}

function MarketCard({ market, onClick }: { market: MarketFlow; onClick: () => void }) {
  const phaseColors: Record<string, string> = {
    early: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    mid: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
    late: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    exit: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
  }

  const marketIcons: Record<string, React.ReactNode> = {
    crypto: <Zap className="w-5 h-5 text-amber-500" />,
    stocks: <BarChart3 className="w-5 h-5 text-blue-500" />,
    bonds: <Landmark className="w-5 h-5 text-emerald-500" />,
    metals: <Target className="w-5 h-5 text-violet-500" />,
  }

  const flow7d = market.flow7d ?? 0
  const flow30d = market.flow30d ?? 0
  const phase = market.phase ?? 'mid'

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-500/50 transition-all hover:shadow-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {marketIcons[market.market] || <Globe className="w-5 h-5 text-slate-500" />}
          <span className="font-bold text-slate-900 dark:text-white capitalize">{market.market}</span>
        </div>
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", phaseColors[phase])}>
          {phase.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-slate-500 dark:text-slate-400">7D Flow</span>
          <div className={cn(
            "font-bold",
            flow7d > 0 ? "text-emerald-600 dark:text-emerald-400" : flow7d < 0 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400"
          )}>
            {flow7d > 0 ? '+' : ''}{flow7d.toFixed(1)}%
          </div>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">30D Flow</span>
          <div className={cn(
            "font-bold",
            flow30d > 0 ? "text-emerald-600 dark:text-emerald-400" : flow30d < 0 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400"
          )}>
            {flow30d > 0 ? '+' : ''}{flow30d.toFixed(1)}%
          </div>
        </div>
      </div>

      {market.rotationSignal && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {market.rotationSignal === 'entering' && <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
          {market.rotationSignal === 'exiting' && <ArrowDownRight className="w-3 h-3 text-red-500" />}
          <span className="text-slate-500 dark:text-slate-400 capitalize">{market.rotationSignal}</span>
        </div>
      )}
    </button>
  )
}

function CoinCard({ coin, onClick }: { coin: TopCoin; onClick: () => void }) {
  const verdictColors: Record<string, string> = {
    GO: 'bg-emerald-500',
    CONDITIONAL_GO: 'bg-amber-500',
    WAIT: 'bg-slate-500',
    AVOID: 'bg-red-500',
  }

  const symbol = coin.symbol?.replace('USDT', '') || coin.symbol

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:border-emerald-500/50 transition-all hover:shadow-lg text-left"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src={getCoinIcon(symbol)}
            alt={symbol}
            className="w-8 h-8 rounded-full"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COIN_ICON }}
          />
          <div>
            <span className="font-bold text-slate-900 dark:text-white">{symbol}</span>
            {coin.method && (
              <span className={cn(
                "ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold",
                coin.method === 'mlis_pro' ? "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300" : "bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300"
              )}>
                {coin.method === 'mlis_pro' ? 'MLIS' : '7-STEP'}
              </span>
            )}
          </div>
        </div>
        <span className={cn("px-2 py-0.5 rounded text-xs font-bold text-white", verdictColors[coin.verdict] || 'bg-slate-500')}>
          {coin.verdict}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          {coin.direction?.toLowerCase() === 'long' ? (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          ) : coin.direction?.toLowerCase() === 'short' ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : (
            <Activity className="w-4 h-4 text-slate-500" />
          )}
          <span className="text-slate-600 dark:text-slate-400 capitalize">{coin.direction || 'Neutral'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-900 dark:text-white font-bold">{(coin.totalScore || 0).toFixed(1)}/10</span>
          {coin.change24h !== undefined && (
            <span className={cn(
              "text-xs font-medium",
              coin.change24h >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ===========================================
// Main Component
// ===========================================

export default function ExplorePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Tab state from URL
  const initialTab = (searchParams.get('tab') as TabType) || 'flow'
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  // Data states
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlowData | null>(null)
  const [topCoins, setTopCoins] = useState<TopCoin[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Selected market for drill-down
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch data
  const fetchData = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)

      const [flowRes, coinsRes] = await Promise.all([
        authFetch('/api/capital-flow/summary'),
        authFetch('/api/analysis/top-coins?limit=20')
      ])

      // Parse JSON responses
      const flowData = await flowRes.json()
      const coinsData = await coinsRes.json()

      if (flowData.success) {
        setCapitalFlow(flowData.data)
      }

      if (coinsData.success) {
        setTopCoins(coinsData.data?.coins || [])
      }
    } catch (error) {
      console.error('Failed to fetch explore data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    router.push(`/explore?tab=${tab}`, { scroll: false })
  }

  // Filter coins by search
  const filteredCoins = topCoins.filter(coin =>
    coin.symbol?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get markets for selected one
  const selectedMarketData = capitalFlow?.markets?.find(m => m.market === selectedMarket)

  if (loading) {
    return (
      <div className="relative min-h-screen bg-slate-50 dark:bg-[#0B1120]">
        <GrainOverlay />
        <GradientOrbs />
        <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading market data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0B1120]">
      <GrainOverlay />
      <GradientOrbs />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
              Explore Markets
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Power user view: Capital Flow, Analysis, and Signals
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => handleTabChange('flow')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              activeTab === 'flow'
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25"
                : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50"
            )}
          >
            <Globe className="w-4 h-4" />
            Capital Flow
          </button>
          <button
            onClick={() => handleTabChange('analyze')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              activeTab === 'analyze'
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25"
                : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Top Coins
          </button>
          <button
            onClick={() => handleTabChange('signals')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              activeTab === 'signals'
                ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25"
                : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50"
            )}
          >
            <Activity className="w-4 h-4" />
            Signals
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'flow' && (
          <div className="space-y-6">
            {/* Global Liquidity Summary */}
            {capitalFlow?.globalLiquidity && (
              <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-blue-500" />
                  Global Liquidity
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Fed Balance</span>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      ${(capitalFlow.globalLiquidity.fedBalanceSheet?.value || 0).toFixed(1)}T
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">DXY</span>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {(capitalFlow.globalLiquidity.dxy?.value || 0).toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">VIX</span>
                    <div className={cn(
                      "text-lg font-bold",
                      (capitalFlow.globalLiquidity.vix?.value || 0) > 25 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                    )}>
                      {(capitalFlow.globalLiquidity.vix?.value || 0).toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Bias</span>
                    <div className={cn(
                      "text-lg font-bold uppercase",
                      capitalFlow.globalLiquidity.bias === 'risk_on' ? "text-emerald-600 dark:text-emerald-400" :
                      capitalFlow.globalLiquidity.bias === 'risk_off' ? "text-red-600 dark:text-red-400" :
                      "text-slate-600 dark:text-slate-400"
                    )}>
                      {(capitalFlow.globalLiquidity.bias || 'neutral').replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Markets Grid */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Market Flows</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {capitalFlow?.markets?.filter(m => m && m.market).map((market) => (
                  <MarketCard
                    key={market.market}
                    market={market}
                    onClick={() => setSelectedMarket(market.market)}
                  />
                ))}
              </div>
            </div>

            {/* Recommendation */}
            {capitalFlow?.recommendation && (
              <div className={cn(
                "p-4 rounded-xl backdrop-blur-sm border",
                capitalFlow.recommendation.action === 'analyze'
                  ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/30"
                  : capitalFlow.recommendation.action === 'wait'
                  ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/30"
                  : "bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/30"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    AI Recommendation
                  </h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold",
                    capitalFlow.recommendation.direction === 'buy'
                      ? "bg-emerald-500 text-white"
                      : capitalFlow.recommendation.direction === 'sell'
                      ? "bg-red-500 text-white"
                      : "bg-slate-500 text-white"
                  )}>
                    {capitalFlow.recommendation.direction?.toUpperCase()} {capitalFlow.recommendation.primaryMarket?.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{capitalFlow.recommendation.reason}</p>
                {capitalFlow.recommendation.suggestedAssets && capitalFlow.recommendation.suggestedAssets.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {capitalFlow.recommendation.suggestedAssets.map((asset) => (
                      <Link
                        key={asset.symbol}
                        href={`/analyze?symbol=${asset.symbol}`}
                        className="px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500/50 transition-colors"
                      >
                        {asset.symbol}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected Market Details */}
            {selectedMarket && selectedMarketData && (
              <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-blue-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                    {selectedMarket} Details
                  </h3>
                  <button
                    onClick={() => setSelectedMarket(null)}
                    className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Close
                  </button>
                </div>

                {selectedMarketData.sectors && selectedMarketData.sectors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Sectors</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedMarketData.sectors.map((sector) => (
                        <div
                          key={sector.name}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-sm"
                        >
                          <div className="font-medium text-slate-900 dark:text-white">{sector.name}</div>
                          <div className={cn(
                            "text-xs",
                            sector.flow7d > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {sector.flow7d > 0 ? '+' : ''}{sector.flow7d.toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <Link
                    href={`/capital-flow?market=${selectedMarket}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View Full Analysis
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analyze' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search coins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Link
                href="/analyze"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Zap className="w-4 h-4" />
                New Analysis
              </Link>
              <Link
                href="/top-coins"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                <Filter className="w-4 h-4" />
                All Top Coins
              </Link>
            </div>

            {/* Coins Grid */}
            {filteredCoins.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCoins.map((coin) => (
                  <CoinCard
                    key={coin.symbol}
                    coin={coin}
                    onClick={() => router.push(`/analyze/details/${coin.analysisId}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">No coins found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'signals' && (
          <div className="space-y-6">
            {/* Signals Summary */}
            <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-500" />
                Signal Service
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Get proactive trading signals delivered to Telegram and Discord
              </p>
              <Link
                href="/signals"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Activity className="w-4 h-4" />
                View Signals
              </Link>
            </div>

            {/* Recent Signals from Top Coins */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Latest Analysis Results</h3>
              <div className="space-y-2">
                {topCoins.slice(0, 10).map((coin) => (
                  <Link
                    key={coin.symbol}
                    href={`/analyze/details/${coin.analysisId}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:border-violet-500/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={getCoinIcon(coin.symbol?.replace('USDT', '') || coin.symbol)}
                        alt={coin.symbol}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COIN_ICON }}
                      />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{coin.symbol?.replace('USDT', '')}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded font-bold text-white",
                            coin.verdict === 'GO' ? 'bg-emerald-500' : coin.verdict === 'CONDITIONAL_GO' ? 'bg-amber-500' : 'bg-slate-500'
                          )}>
                            {coin.verdict}
                          </span>
                          <span className="text-slate-500 capitalize">{coin.direction}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-white">{(coin.totalScore || 0).toFixed(1)}/10</div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Navigation */}
        <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              ← Back to Simple View
            </Link>
            <Link
              href="/capital-flow"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              Full Capital Flow →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
