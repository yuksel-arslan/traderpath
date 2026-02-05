'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Bell,
  Zap,
  Info,
  BarChart3,
  Flame,
  Star
} from 'lucide-react'
import Link from 'next/link'

export interface TrafficLightSignal {
  id: string
  color: 'green' | 'yellow' | 'red'
  action: 'BUY' | 'SELL' | 'WATCH' | 'WAIT' | 'STAY_OUT'
  asset: string
  assetClass: 'crypto' | 'stocks' | 'metals' | 'bonds'
  score: number
  confidence: number
  reason: string
  details: {
    capitalFlowBias: string
    marketPhase: string
    sectorStrength: string
    mlisConfirmation?: boolean
  }
  analysisId?: string
  expiresAt?: string
}

interface TrafficLightProps {
  signals: TrafficLightSignal[]
  onNotifyMe?: () => void
  onAnalyze?: (asset: string) => void
  streak?: number
  xp?: number
  level?: number
  nextLevelXp?: number
}

const colorConfig = {
  green: {
    bg: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
    glow: 'shadow-emerald-500/50',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    pulse: 'bg-emerald-500',
    icon: TrendingUp,
    label: 'OPPORTUNITY'
  },
  yellow: {
    bg: 'from-amber-500/20 via-amber-500/10 to-transparent',
    glow: 'shadow-amber-500/50',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    pulse: 'bg-amber-500',
    icon: Clock,
    label: 'FORMING'
  },
  red: {
    bg: 'from-red-500/20 via-red-500/10 to-transparent',
    glow: 'shadow-red-500/50',
    text: 'text-red-400',
    border: 'border-red-500/30',
    pulse: 'bg-red-500',
    icon: AlertTriangle,
    label: 'STAY OUT'
  }
}

const actionLabels = {
  BUY: { text: 'BUY', subtext: 'NOW' },
  SELL: { text: 'SELL', subtext: 'NOW' },
  WATCH: { text: 'WATCH', subtext: 'FORMING' },
  WAIT: { text: 'WAIT', subtext: 'PATIENCE' },
  STAY_OUT: { text: 'STAY', subtext: 'OUT' }
}

export function TrafficLight({
  signals,
  onNotifyMe,
  onAnalyze,
  streak = 0,
  xp = 0,
  level = 1,
  nextLevelXp = 100
}: TrafficLightProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  const hasSignals = signals.length > 0
  const currentSignal = hasSignals ? signals[currentIndex] : null
  const config = currentSignal ? colorConfig[currentSignal.color] : colorConfig.red

  const nextSignal = () => {
    if (signals.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % signals.length)
      setShowDetails(false)
    }
  }

  const prevSignal = () => {
    if (signals.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + signals.length) % signals.length)
      setShowDetails(false)
    }
  }

  // Auto-rotate signals every 10 seconds if not interacting
  useEffect(() => {
    if (signals.length <= 1 || showDetails) return
    const interval = setInterval(nextSignal, 10000)
    return () => clearInterval(interval)
  }, [signals.length, showDetails])

  const xpProgress = nextLevelXp > 0 ? (xp / nextLevelXp) * 100 : 0

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Gamification Bar - Minimal */}
      {(streak > 0 || xp > 0) && (
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-center gap-4 text-sm">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-orange-400 font-medium">{streak} day streak</span>
            </div>
          )}
          {xp > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
              <Star className="w-4 h-4 text-violet-500" />
              <span className="text-violet-400 font-medium">Lv.{level}</span>
              <div className="w-16 h-1.5 bg-violet-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Traffic Light Container */}
      <motion.div
        className={`relative rounded-3xl border ${config.border} bg-gradient-to-b ${config.bg} backdrop-blur-xl overflow-hidden`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Glowing orb effect */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full ${config.pulse} opacity-20 blur-3xl`} />

        {/* Navigation arrows for multiple signals */}
        {signals.length > 1 && (
          <>
            <button
              onClick={prevSignal}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
            >
              <ChevronLeft className="w-5 h-5 text-white/70" />
            </button>
            <button
              onClick={nextSignal}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5 text-white/70" />
            </button>
          </>
        )}

        {/* Signal indicators */}
        {signals.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {signals.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? `${config.pulse} scale-125`
                    : 'bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        <div className="relative p-8 pt-12">
          <AnimatePresence mode="wait">
            {currentSignal ? (
              <motion.div
                key={currentSignal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {/* Traffic Light Circle */}
                <div className="relative mx-auto mb-6">
                  <motion.div
                    className={`w-32 h-32 mx-auto rounded-full ${config.pulse} shadow-2xl ${config.glow}`}
                    animate={{
                      boxShadow: [
                        `0 0 20px 10px ${currentSignal.color === 'green' ? 'rgba(16, 185, 129, 0.3)' : currentSignal.color === 'yellow' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        `0 0 40px 20px ${currentSignal.color === 'green' ? 'rgba(16, 185, 129, 0.5)' : currentSignal.color === 'yellow' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                        `0 0 20px 10px ${currentSignal.color === 'green' ? 'rgba(16, 185, 129, 0.3)' : currentSignal.color === 'yellow' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <config.icon className="w-16 h-16 text-white" />
                    </div>
                  </motion.div>
                </div>

                {/* Action Text */}
                <div className="mb-4">
                  <motion.h1
                    className={`text-5xl font-black ${config.text} tracking-tight`}
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {actionLabels[currentSignal.action].text}
                  </motion.h1>
                  <h2 className={`text-3xl font-bold ${config.text} opacity-80`}>
                    {currentSignal.asset}
                  </h2>
                  <p className="text-lg text-white/50 font-medium mt-1">
                    {actionLabels[currentSignal.action].subtext}
                  </p>
                </div>

                {/* Reason */}
                <p className="text-white/70 text-base mb-6 max-w-xs mx-auto">
                  {currentSignal.reason}
                </p>

                {/* Score & Confidence */}
                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${config.text}`}>
                      {currentSignal.score.toFixed(1)}
                    </div>
                    <div className="text-xs text-white/40 uppercase tracking-wider">Score</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${config.text}`}>
                      {currentSignal.confidence}%
                    </div>
                    <div className="text-xs text-white/40 uppercase tracking-wider">Confidence</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                  >
                    <Info className="w-4 h-4" />
                    <span className="font-medium">Why?</span>
                  </button>
                  {currentSignal.analysisId ? (
                    <Link
                      href={`/analyze/details/${currentSignal.analysisId}`}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl ${config.pulse} hover:opacity-90 transition-all font-medium text-white`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Full Analysis</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => onAnalyze?.(currentSignal.asset)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl ${config.pulse} hover:opacity-90 transition-all font-medium text-white`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>Analyze Now</span>
                    </button>
                  )}
                </div>

                {/* Expandable Details */}
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-left">
                        <h4 className="text-sm font-semibold text-white/80 mb-3">Signal Details</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-white/40">Capital Flow</span>
                            <p className="text-white/80 font-medium">{currentSignal.details.capitalFlowBias}</p>
                          </div>
                          <div>
                            <span className="text-white/40">Market Phase</span>
                            <p className="text-white/80 font-medium">{currentSignal.details.marketPhase}</p>
                          </div>
                          <div>
                            <span className="text-white/40">Sector</span>
                            <p className="text-white/80 font-medium">{currentSignal.details.sectorStrength}</p>
                          </div>
                          <div>
                            <span className="text-white/40">MLIS Confirmed</span>
                            <p className={`font-medium ${currentSignal.details.mlisConfirmation ? 'text-emerald-400' : 'text-white/40'}`}>
                              {currentSignal.details.mlisConfirmation ? 'Yes ✓' : 'No'}
                            </p>
                          </div>
                        </div>
                        {currentSignal.expiresAt && (
                          <p className="mt-3 text-xs text-white/40">
                            Signal valid until: {new Date(currentSignal.expiresAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* No Signals State */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                {/* Red Light */}
                <div className="relative mx-auto mb-6">
                  <motion.div
                    className="w-32 h-32 mx-auto rounded-full bg-red-500/30 shadow-2xl"
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <AlertTriangle className="w-16 h-16 text-red-400" />
                    </div>
                  </motion.div>
                </div>

                <h1 className="text-4xl font-black text-red-400 mb-2">
                  NO OPPORTUNITIES
                </h1>
                <p className="text-white/50 text-lg mb-2">
                  Market conditions unfavorable
                </p>
                <p className="text-white/30 text-sm mb-8">
                  AI is continuously scanning. You'll be notified.
                </p>

                <button
                  onClick={onNotifyMe}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all mx-auto"
                >
                  <Bell className="w-5 h-5" />
                  <span className="font-medium">Notify me when ready</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom info bar */}
        <div className="px-6 py-3 bg-white/5 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>AI scanning every 15 min</span>
          <Link href="/explore" className="hover:text-white/70 transition-colors">
            Power User View →
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default TrafficLight
