'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/api'
import type { TrafficLightSignal } from './TrafficLight'

interface CapitalFlowSummary {
  globalLiquidity: {
    netLiquidity: number
    bias: 'risk_on' | 'risk_off' | 'neutral'
    fedBalanceSheet: { value: number; change7d: number }
    m2MoneySupply: { value: number; change7d: number }
    dxy: { value: number; change7d: number }
    vix: { value: number; level: string }
  }
  markets: Array<{
    market: string
    flow7d: number
    flow30d: number
    flowVelocity: number
    phase: 'early' | 'mid' | 'late' | 'exit'
    rotationSignal: 'entering' | 'stable' | 'exiting' | null
    sectors?: Array<{
      name: string
      flow7d: number
      trending: 'up' | 'down' | 'stable'
    }>
  }>
  recommendation?: {
    action: 'analyze' | 'wait' | 'avoid'
    direction: 'buy' | 'sell' | 'neutral'
    primaryMarket: string
    confidence: number
    reason: string
    sectors?: string[]
    suggestedAssets?: string[]
  }
  sellRecommendation?: {
    action: string
    direction: string
    primaryMarket: string
    confidence: number
    reason: string
    sectors?: string[]
    suggestedAssets?: string[]
  }
}

interface TopCoin {
  symbol: string
  totalScore: number
  verdict: string
  direction: string
  analysisId: string
  change24h?: number
}

interface UseProactiveSignalsResult {
  signals: TrafficLightSignal[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  lastUpdated: Date | null
}

export function useProactiveSignals(): UseProactiveSignalsResult {
  const [signals, setSignals] = useState<TrafficLightSignal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchSignals = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch capital flow data and top coins in parallel
      const [capitalFlowRes, topCoinsRes] = await Promise.all([
        authFetch('/api/capital-flow/summary'),
        authFetch('/api/analysis/top-coins?limit=5&tradeableOnly=true')
      ])

      const capitalFlow: CapitalFlowSummary = capitalFlowRes.success ? capitalFlowRes.data : null
      const topCoins: TopCoin[] = topCoinsRes.success ? (topCoinsRes.data?.coins || []) : []

      const newSignals: TrafficLightSignal[] = []

      // Convert capital flow recommendation to signals
      if (capitalFlow?.recommendation) {
        const rec = capitalFlow.recommendation
        const isPositive = rec.direction === 'buy' && rec.action === 'analyze'
        const isNegative = rec.direction === 'sell' || rec.action === 'avoid'

        // Find the market data for primary market
        const marketData = capitalFlow.markets?.find(
          m => m.market?.toLowerCase() === rec.primaryMarket?.toLowerCase()
        )

        if (isPositive && rec.suggestedAssets && rec.suggestedAssets.length > 0) {
          // Create signals for each suggested asset
          for (const asset of rec.suggestedAssets.slice(0, 3)) {
            // Check if we have a pre-analyzed version from top coins
            const preAnalyzed = topCoins.find(
              c => c.symbol?.replace('USDT', '') === asset || c.symbol === asset
            )

            newSignals.push({
              id: `buy-${asset}-${Date.now()}`,
              color: 'green',
              action: 'BUY',
              asset: asset,
              assetClass: rec.primaryMarket as any || 'crypto',
              score: preAnalyzed?.totalScore || (rec.confidence / 10),
              confidence: rec.confidence,
              reason: rec.reason,
              details: {
                capitalFlowBias: capitalFlow.globalLiquidity?.bias?.toUpperCase() || 'NEUTRAL',
                marketPhase: marketData?.phase?.toUpperCase() || 'MID',
                sectorStrength: rec.sectors?.[0] || 'General',
                mlisConfirmation: preAnalyzed ? preAnalyzed.verdict === 'GO' : undefined
              },
              analysisId: preAnalyzed?.analysisId,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
            })
          }
        } else if (!isPositive && !isNegative) {
          // WATCH state - conditions forming
          const watchAsset = rec.suggestedAssets?.[0] || rec.primaryMarket?.toUpperCase() || 'MARKET'
          newSignals.push({
            id: `watch-${watchAsset}-${Date.now()}`,
            color: 'yellow',
            action: 'WATCH',
            asset: watchAsset,
            assetClass: rec.primaryMarket as any || 'crypto',
            score: rec.confidence / 10,
            confidence: rec.confidence,
            reason: rec.reason || 'Conditions forming, patience required',
            details: {
              capitalFlowBias: capitalFlow.globalLiquidity?.bias?.toUpperCase() || 'NEUTRAL',
              marketPhase: marketData?.phase?.toUpperCase() || 'MID',
              sectorStrength: rec.sectors?.[0] || 'Mixed'
            },
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
          })
        }
      }

      // Add SELL signals if present
      if (capitalFlow?.sellRecommendation) {
        const sell = capitalFlow.sellRecommendation
        const marketData = capitalFlow.markets?.find(
          m => m.market?.toLowerCase() === sell.primaryMarket?.toLowerCase()
        )

        if (sell.suggestedAssets && sell.suggestedAssets.length > 0) {
          for (const asset of sell.suggestedAssets.slice(0, 2)) {
            newSignals.push({
              id: `sell-${asset}-${Date.now()}`,
              color: 'red',
              action: 'SELL',
              asset: asset,
              assetClass: sell.primaryMarket as any || 'crypto',
              score: sell.confidence / 10,
              confidence: sell.confidence,
              reason: sell.reason,
              details: {
                capitalFlowBias: capitalFlow.globalLiquidity?.bias?.toUpperCase() || 'NEUTRAL',
                marketPhase: marketData?.phase?.toUpperCase() || 'LATE',
                sectorStrength: sell.sectors?.[0] || 'Weakening'
              },
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            })
          }
        }
      }

      // If we have top coins but no capital flow signals, use top coins directly
      if (newSignals.length === 0 && topCoins.length > 0) {
        for (const coin of topCoins.slice(0, 3)) {
          const isGo = coin.verdict === 'GO' || coin.verdict === 'CONDITIONAL_GO'
          const isLong = coin.direction?.toLowerCase() === 'long'

          newSignals.push({
            id: `coin-${coin.symbol}-${Date.now()}`,
            color: isGo ? 'green' : 'yellow',
            action: isGo ? (isLong ? 'BUY' : 'SELL') : 'WATCH',
            asset: coin.symbol?.replace('USDT', '') || coin.symbol,
            assetClass: 'crypto',
            score: coin.totalScore || 0,
            confidence: Math.round((coin.totalScore || 0) * 10),
            reason: `${coin.verdict} signal with ${coin.direction} direction`,
            details: {
              capitalFlowBias: 'SCANNING',
              marketPhase: 'ANALYZING',
              sectorStrength: 'Crypto',
              mlisConfirmation: coin.verdict === 'GO'
            },
            analysisId: coin.analysisId,
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          })
        }
      }

      // Sort by score descending
      newSignals.sort((a, b) => b.score - a.score)

      setSignals(newSignals)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch proactive signals:', err)
      setError('Failed to load market signals')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchSignals()
  }, [fetchSignals])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchSignals, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchSignals])

  return {
    signals,
    isLoading,
    error,
    refetch: fetchSignals,
    lastUpdated
  }
}
