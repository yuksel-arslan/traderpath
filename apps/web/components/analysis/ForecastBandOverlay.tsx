'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

interface ForecastBand {
  horizon: 'short' | 'medium' | 'long';
  label: string;
  barsAhead: number;
  p10: number;
  p50: number;
  p90: number;
  bandWidthPercent: number;
  drivers: string[];
  invalidations: string[];
}

interface ForecastBandOverlayProps {
  bands: ForecastBand[];
  currentPrice: number;
  symbol: string;
}

const HORIZON_CONFIG: Record<
  string,
  { gradient: string; border: string; accent: string; bgAccent: string }
> = {
  short: {
    gradient: 'from-emerald-500/20 to-teal-500/10',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400',
    bgAccent: 'bg-emerald-500/10',
  },
  medium: {
    gradient: 'from-blue-500/20 to-indigo-500/10',
    border: 'border-blue-500/30',
    accent: 'text-blue-400',
    bgAccent: 'bg-blue-500/10',
  },
  long: {
    gradient: 'from-violet-500/20 to-purple-500/10',
    border: 'border-violet-500/30',
    accent: 'text-violet-400',
    bgAccent: 'bg-violet-500/10',
  },
};

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 100) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function getDirection(p50: number, currentPrice: number): 'bullish' | 'bearish' | 'neutral' {
  if (currentPrice === 0) return 'neutral';
  const changePercent = ((p50 - currentPrice) / currentPrice) * 100;
  if (changePercent > 0.5) return 'bullish';
  if (changePercent < -0.5) return 'bearish';
  return 'neutral';
}

function getDirectionColor(direction: 'bullish' | 'bearish' | 'neutral'): {
  text: string;
  bg: string;
  bar: string;
  glow: string;
} {
  switch (direction) {
    case 'bullish':
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/15',
        bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
        glow: 'shadow-emerald-500/20',
      };
    case 'bearish':
      return {
        text: 'text-rose-400',
        bg: 'bg-rose-500/15',
        bar: 'bg-gradient-to-r from-rose-500 to-red-400',
        glow: 'shadow-rose-500/20',
      };
    default:
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-500/15',
        bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
        glow: 'shadow-amber-500/20',
      };
  }
}

function DirectionIcon({ direction, size = 16 }: { direction: 'bullish' | 'bearish' | 'neutral'; size?: number }) {
  const colors = getDirectionColor(direction);
  switch (direction) {
    case 'bullish':
      return <TrendingUp size={size} className={colors.text} />;
    case 'bearish':
      return <TrendingDown size={size} className={colors.text} />;
    default:
      return <Minus size={size} className={colors.text} />;
  }
}

function RangeBar({
  p10,
  p50,
  p90,
  currentPrice,
  direction,
}: {
  p10: number;
  p50: number;
  p90: number;
  currentPrice: number;
  direction: 'bullish' | 'bearish' | 'neutral';
}) {
  const range = p90 - p10;
  if (range <= 0) return null;

  const p50Position = ((p50 - p10) / range) * 100;
  const currentPosition = Math.max(0, Math.min(100, ((currentPrice - p10) / range) * 100));
  const colors = getDirectionColor(direction);

  return (
    <div className="relative mt-3 mb-1">
      {/* Bar background */}
      <div className="relative h-3 rounded-full bg-slate-700/50 dark:bg-slate-700/50 bg-slate-200/70 overflow-hidden">
        {/* P10-P90 gradient fill */}
        <div
          className={`absolute inset-y-0 left-0 right-0 rounded-full opacity-30 ${colors.bar}`}
        />
        {/* P10-P50 stronger fill */}
        <div
          className={`absolute inset-y-0 left-0 rounded-l-full opacity-50 ${colors.bar}`}
          style={{ width: `${p50Position}%` }}
        />
        {/* P50 marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-white bg-slate-900 dark:bg-slate-900 z-20 shadow-lg"
          style={{ left: `${p50Position}%`, marginLeft: '-7px' }}
        />
        {/* Current price marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white/60 dark:bg-white/60 z-10"
          style={{ left: `${currentPosition}%` }}
        />
      </div>
      {/* Labels below bar */}
      <div className="flex justify-between mt-1.5 text-[10px] text-slate-500 dark:text-slate-500">
        <span>P10</span>
        <span className="font-medium text-slate-300 dark:text-slate-300">P50</span>
        <span>P90</span>
      </div>
    </div>
  );
}

function BandCard({ band, currentPrice }: { band: ForecastBand; currentPrice: number }) {
  const [invalidationsOpen, setInvalidationsOpen] = useState(false);
  const config = HORIZON_CONFIG[band.horizon] || HORIZON_CONFIG.short;
  const safeP10 = band.p10 ?? 0;
  const safeP50 = band.p50 ?? 0;
  const safeP90 = band.p90 ?? 0;
  const direction = getDirection(safeP50, currentPrice);
  const dirColors = getDirectionColor(direction);
  const changePercent = currentPrice > 0 ? ((safeP50 - currentPrice) / currentPrice) * 100 : 0;

  return (
    <div
      className={`
        relative rounded-2xl border ${config.border}
        bg-gradient-to-br ${config.gradient}
        backdrop-blur-xl
        p-4
        transition-all duration-300
        hover:shadow-lg hover:${dirColors.glow}
        hover:scale-[1.01]
        dark:bg-slate-900/40 bg-white/60
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${config.bgAccent}`}>
            <Activity size={14} className={config.accent} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {band.label}
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {band.barsAhead} bars ahead
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${dirColors.bg}`}>
          <DirectionIcon direction={direction} size={14} />
          <span className={`text-xs font-semibold ${dirColors.text}`}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Price levels */}
      <div className="grid grid-cols-3 gap-2 mb-1">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-0.5">
            Lower
          </p>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            ${formatPrice(safeP10)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-0.5">
            Expected
          </p>
          <p className={`text-base font-bold ${dirColors.text}`}>
            ${formatPrice(safeP50)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-0.5">
            Upper
          </p>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            ${formatPrice(safeP90)}
          </p>
        </div>
      </div>

      {/* Range bar */}
      <RangeBar
        p10={safeP10}
        p50={safeP50}
        p90={safeP90}
        currentPrice={currentPrice}
        direction={direction}
      />

      {/* Band width */}
      <div className="flex items-center justify-center mt-2 mb-3">
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          Band Width:
        </span>
        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 ml-1">
          {(band.bandWidthPercent ?? 0).toFixed(1)}%
        </span>
      </div>

      {/* Drivers */}
      {band.drivers && band.drivers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {band.drivers.map((driver, i) => (
            <span
              key={i}
              className={`
                inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium
                ${config.bgAccent} ${config.accent}
                dark:bg-opacity-100 bg-opacity-100
              `}
            >
              {driver}
            </span>
          ))}
        </div>
      )}

      {/* Invalidations (expandable) */}
      {band.invalidations && band.invalidations.length > 0 && (
        <div className="border-t border-slate-200/20 dark:border-slate-700/40 pt-2">
          <button
            onClick={() => setInvalidationsOpen(!invalidationsOpen)}
            className="flex items-center gap-1 w-full text-left group"
          >
            <AlertTriangle size={12} className="text-amber-500/70" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-slate-300 transition-colors">
              {band.invalidations.length} invalidation{band.invalidations.length > 1 ? 's' : ''}
            </span>
            {invalidationsOpen ? (
              <ChevronUp size={12} className="text-slate-500 ml-auto" />
            ) : (
              <ChevronDown size={12} className="text-slate-500 ml-auto" />
            )}
          </button>
          {invalidationsOpen && (
            <ul className="mt-1.5 space-y-1">
              {band.invalidations.map((inv, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-[10px] text-amber-400/80 dark:text-amber-400/80"
                >
                  <span className="mt-0.5 w-1 h-1 rounded-full bg-amber-500/60 flex-shrink-0" />
                  {inv}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function ForecastBandOverlay({ bands, currentPrice, symbol }: ForecastBandOverlayProps) {
  if (!bands || bands.length === 0) return null;

  const sortedBands = [...bands].sort((a, b) => {
    const order = { short: 0, medium: 1, long: 2 };
    return (order[a.horizon] ?? 0) - (order[b.horizon] ?? 0);
  });

  return (
    <div className="w-full">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 border border-teal-500/20">
            <BarChart3 size={18} className="text-teal-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              AI Forecast Bands
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {symbol} &middot; P10/P50/P90 probability ranges &middot; Current ${formatPrice(currentPrice)}
            </p>
          </div>
        </div>
      </div>

      {/* Band cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedBands.map((band) => (
          <BandCard key={band.horizon} band={band} currentPrice={currentPrice} />
        ))}
      </div>
    </div>
  );
}
