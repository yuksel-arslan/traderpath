'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  CheckCircle2,
  XCircle,
  Timer,
  Target,
  Flame,
  Activity,
  Clock,
  AlertTriangle,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// =====================================================
// TYPES
// =====================================================

interface QualityData {
  breakdown: {
    l1l4Alignment: number;
    technicalStrength: number;
    momentum: number;
    volatilityAdjusted: number;
  };
  qualityLabel: string;
  tooltip: string;
  forecastBands?: Array<{
    horizon: string;
    timeframe: string;
    p10: number;
    p50: number;
    p90: number;
    p10Percent: number;
    p50Percent: number;
    p90Percent: number;
  }>;
}

export interface SignalCardProps {
  signal: {
    id: string;
    symbol: string;
    assetClass: string;
    market: string;
    direction: 'long' | 'short';
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    riskRewardRatio: number;
    classicVerdict: string;
    classicScore: number;
    mlisConfirmation: boolean;
    mlisRecommendation?: string;
    mlisConfidence?: number;
    overallConfidence: number;
    qualityScore?: number | null;
    qualityData?: QualityData | null;
    capitalFlowPhase: string;
    capitalFlowBias: string;
    sectorFlow?: number | null;
    status: 'pending' | 'published' | 'expired' | 'cancelled';
    publishedAt?: string;
    expiresAt: string;
    outcome?: string;
    outcomePrice?: number | null;
    pnlPercent?: number | null;
    outcomeAt?: string;
    createdAt: string;
  };
  onClick?: () => void;
}

// =====================================================
// CONFIG
// =====================================================

const MARKET_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  crypto: { label: 'Crypto', icon: '\u20BF', color: 'from-orange-500 to-yellow-500' },
  stocks: { label: 'Stocks', icon: '\uD83D\uDCC8', color: 'from-blue-500 to-cyan-500' },
  metals: { label: 'Metals', icon: '\uD83E\uDD47', color: 'from-yellow-600 to-amber-600' },
  bonds: { label: 'Bonds', icon: '\uD83D\uDCCA', color: 'from-gray-600 to-slate-600' },
};

const VERDICT_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }> = {
  GO: { label: 'GO', bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/30', icon: CheckCircle2 },
  CONDITIONAL_GO: { label: 'COND', bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/30', icon: Zap },
  WAIT: { label: 'WAIT', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/30', icon: Clock },
  AVOID: { label: 'AVOID', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30', icon: AlertTriangle },
};

const OUTCOME_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof Target }> = {
  tp1_hit: { label: 'TP1 HIT', bg: 'bg-green-500', text: 'text-white', icon: Target },
  tp2_hit: { label: 'TP2 HIT', bg: 'bg-green-600', text: 'text-white', icon: Flame },
  sl_hit: { label: 'SL HIT', bg: 'bg-red-500', text: 'text-white', icon: XCircle },
  expired: { label: 'EXPIRED', bg: 'bg-gray-500', text: 'text-white', icon: Timer },
  pending: { label: 'LIVE', bg: 'bg-blue-500', text: 'text-white', icon: Activity },
};

const PHASE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  early: { label: 'Early', icon: '\uD83C\uDF31', color: 'text-green-600 dark:text-green-400' },
  mid: { label: 'Mid', icon: '\uD83C\uDF3F', color: 'text-blue-600 dark:text-blue-400' },
  late: { label: 'Late', icon: '\uD83C\uDF42', color: 'text-orange-600 dark:text-orange-400' },
  exit: { label: 'Exit', icon: '\uD83C\uDF41', color: 'text-red-600 dark:text-red-400' },
};

// =====================================================
// QUALITY SCORE BADGE
// =====================================================

function QualityScoreBadge({ score, label, tooltip }: { score: number; label: string; tooltip: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Color based on score
  let bgColor: string;
  let textColor: string;
  let ringColor: string;
  let glowColor: string;

  if (score > 70) {
    bgColor = 'bg-[#5EEDC3]/15';
    textColor = 'text-[#5EEDC3]';
    ringColor = 'ring-[#5EEDC3]/40';
    glowColor = 'shadow-[#5EEDC3]/20';
  } else if (score > 40) {
    bgColor = 'bg-[#F59E0B]/15';
    textColor = 'text-[#F59E0B]';
    ringColor = 'ring-[#F59E0B]/40';
    glowColor = 'shadow-[#F59E0B]/20';
  } else {
    bgColor = 'bg-[#EF5A6F]/15';
    textColor = 'text-[#EF5A6F]';
    ringColor = 'ring-[#EF5A6F]/40';
    glowColor = 'shadow-[#EF5A6F]/20';
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg ring-1',
        bgColor, textColor, ringColor,
        'shadow-sm', glowColor,
      )}>
        <span className="text-lg font-bold tabular-nums">{score}</span>
        <span className="text-xs font-medium opacity-80">/100</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg shadow-xl pointer-events-none">
          <p className="font-semibold mb-1">{label}</p>
          <p className="opacity-80">{tooltip}</p>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45" />
        </div>
      )}
    </div>
  );
}

// =====================================================
// QUALITY BREAKDOWN BAR
// =====================================================

function QualityBreakdown({ breakdown }: { breakdown: QualityData['breakdown'] }) {
  const items = [
    { label: 'L1-L4 Alignment', value: breakdown.l1l4Alignment, weight: '40%', color: 'bg-teal-500' },
    { label: 'Technical', value: breakdown.technicalStrength, weight: '30%', color: 'bg-blue-500' },
    { label: 'Momentum', value: breakdown.momentum, weight: '20%', color: 'bg-purple-500' },
    { label: 'Volatility Adj.', value: breakdown.volatilityAdjusted, weight: '10%', color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              {item.label} <span className="opacity-50">({item.weight})</span>
            </span>
            <span className="font-medium text-slate-900 dark:text-white tabular-nums">{item.value}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', item.color)}
              style={{ width: `${Math.min(100, item.value)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// FORECAST BANDS
// =====================================================

function ForecastBands({ bands, entryPrice }: { bands: QualityData['forecastBands']; entryPrice: number }) {
  if (!bands || bands.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Price Forecast</p>
      {bands.map((band) => {
        // Calculate range for visual positioning
        const rangeMin = band.p10;
        const rangeMax = band.p90;
        const rangeSpan = rangeMax - rangeMin;
        const p50Position = rangeSpan > 0 ? ((band.p50 - rangeMin) / rangeSpan) * 100 : 50;
        const entryPosition = rangeSpan > 0 ? ((entryPrice - rangeMin) / rangeSpan) * 100 : 50;

        return (
          <div key={band.horizon} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">{band.timeframe}</span>
            </div>

            {/* Visual band */}
            <div className="relative h-6 bg-slate-100 dark:bg-slate-700/50 rounded-md overflow-hidden">
              {/* P10-P90 range */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-yellow-500/20 to-green-500/20 rounded-md" />

              {/* P50 marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500"
                style={{ left: `${Math.max(0, Math.min(100, p50Position))}%` }}
              />

              {/* Entry marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/80 border-l border-dashed border-white/50"
                style={{ left: `${Math.max(0, Math.min(100, entryPosition))}%` }}
              />
            </div>

            {/* Labels */}
            <div className="flex items-center justify-between text-[10px] tabular-nums">
              <span className="text-red-500 dark:text-red-400">
                P10: ${formatPriceShort(band.p10)} ({band.p10Percent >= 0 ? '+' : ''}{band.p10Percent.toFixed(1)}%)
              </span>
              <span className="text-blue-500 dark:text-blue-400 font-medium">
                P50: ${formatPriceShort(band.p50)} ({band.p50Percent >= 0 ? '+' : ''}{band.p50Percent.toFixed(1)}%)
              </span>
              <span className="text-green-500 dark:text-green-400">
                P90: ${formatPriceShort(band.p90)} ({band.p90Percent >= 0 ? '+' : ''}{band.p90Percent.toFixed(1)}%)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================
// MAIN SIGNAL CARD
// =====================================================

export default function SignalCard({ signal, onClick }: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);

  const outcomeStatus = signal.outcome || (
    signal.status === 'published' && new Date(signal.expiresAt) > new Date() ? 'pending' : null
  );

  const verdictConfig = VERDICT_CONFIG[signal.classicVerdict];
  const outcomeConfig = outcomeStatus ? OUTCOME_CONFIG[outcomeStatus as keyof typeof OUTCOME_CONFIG] : null;
  const phaseConfig = PHASE_CONFIG[signal.capitalFlowPhase];
  const marketConfig = MARKET_CONFIG[signal.market] || MARKET_CONFIG.crypto;
  const qualityData = signal.qualityData as QualityData | null;

  return (
    <div
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-lg hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Market Icon + Symbol */}
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-lg',
            `bg-gradient-to-br ${marketConfig.color}`
          )}>
            {marketConfig.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{signal.symbol}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{marketConfig.label}</p>
          </div>

          {/* Direction */}
          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1',
            signal.direction === 'long'
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400'
          )}>
            {signal.direction === 'long' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {signal.direction.toUpperCase()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quality Score Badge */}
          {signal.qualityScore != null && qualityData && (
            <QualityScoreBadge
              score={signal.qualityScore}
              label={qualityData.qualityLabel}
              tooltip={qualityData.tooltip}
            />
          )}

          {/* Outcome Badge */}
          {outcomeConfig && (
            <div className={cn(
              'px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1',
              outcomeConfig.bg,
              outcomeConfig.text
            )}>
              <outcomeConfig.icon className="w-3 h-3" />
              {outcomeConfig.label}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Analysis Section */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Analysis</p>

          {verdictConfig && (
            <div className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium',
              verdictConfig.bg, verdictConfig.text, verdictConfig.border
            )}>
              <verdictConfig.icon className="w-3 h-3" />
              {verdictConfig.label}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-400">Score:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{signal.classicScore.toFixed(1)}/10</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-400">Confidence:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{signal.overallConfidence}%</span>
          </div>

          {signal.mlisConfirmation && (
            <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="w-3 h-3" />
              MLIS Confirmed
            </div>
          )}

          {phaseConfig && (
            <div className="flex items-center gap-1 text-xs">
              <span>{phaseConfig.icon}</span>
              <span className={phaseConfig.color}>{phaseConfig.label} Phase</span>
            </div>
          )}
        </div>

        {/* Trade Plan Section */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Trade Plan</p>

          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Entry:</span>
              <span className="font-sans font-medium text-slate-900 dark:text-white">
                ${formatPriceShort(signal.entryPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-600 dark:text-red-400">SL:</span>
              <span className="font-sans font-medium text-red-600 dark:text-red-400">
                ${formatPriceShort(signal.stopLoss)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-600 dark:text-green-400">TP1:</span>
              <span className="font-sans font-medium text-green-600 dark:text-green-400">
                ${formatPriceShort(signal.takeProfit1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-600 dark:text-green-400">TP2:</span>
              <span className="font-sans font-medium text-green-600 dark:text-green-400">
                ${formatPriceShort(signal.takeProfit2)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">R:R</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{signal.riskRewardRatio.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Performance Section */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Performance</p>

          {signal.pnlPercent != null ? (
            <div className={cn(
              'text-2xl font-bold',
              signal.pnlPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {signal.pnlPercent >= 0 ? '+' : ''}{signal.pnlPercent.toFixed(2)}%
            </div>
          ) : (
            <div className="text-slate-400 dark:text-slate-500 text-sm">Pending</div>
          )}

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div>Created: {new Date(signal.createdAt).toLocaleDateString()}</div>
            {signal.publishedAt && <div>Published: {new Date(signal.publishedAt).toLocaleDateString()}</div>}
            <div>Expires: {new Date(signal.expiresAt).toLocaleDateString()}</div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="w-full px-3 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm group-hover:scale-105"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>
        </div>
      </div>

      {/* Expandable Quality Breakdown + Forecast */}
      {signal.qualityScore != null && qualityData && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            Quality Breakdown & Forecast
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4" onClick={(e) => e.stopPropagation()}>
              <QualityBreakdown breakdown={qualityData.breakdown} />
              <ForecastBands bands={qualityData.forecastBands} entryPrice={signal.entryPrice} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================
// UTILS
// =====================================================

function formatPriceShort(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
}
