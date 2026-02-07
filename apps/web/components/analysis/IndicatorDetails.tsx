'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  BarChart3,
  Waves,
  Volume2,
  Zap,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Target
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { IndicatorDetail, IndicatorAnalysis, DivergenceInfo } from '@traderpath/types';

interface IndicatorDetailsProps {
  data?: IndicatorAnalysis;
  title?: string;
  compact?: boolean;
}

const CATEGORY_CONFIG = {
  trend: { icon: TrendingUp, label: 'Trend Indicators', color: 'blue' },
  momentum: { icon: Activity, label: 'Momentum Indicators', color: 'purple' },
  volatility: { icon: Waves, label: 'Volatility Indicators', color: 'orange' },
  volume: { icon: Volume2, label: 'Volume Indicators', color: 'cyan' },
  advanced: { icon: Zap, label: 'Advanced Indicators', color: 'amber' },
};

const colorClasses = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-500' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500' },
};

function getSignalIcon(signal: string) {
  switch (signal) {
    case 'bullish':
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'bearish':
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    default:
      return <Minus className="w-4 h-4 text-gray-400" />;
  }
}

function getSignalBadgeClass(signal: string, strength: string) {
  if (signal === 'bullish') {
    return strength === 'strong'
      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
      : strength === 'moderate'
      ? 'bg-green-500/15 text-green-400/80'
      : 'bg-green-500/10 text-green-400/60';
  }
  if (signal === 'bearish') {
    return strength === 'strong'
      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
      : strength === 'moderate'
      ? 'bg-red-500/15 text-red-400/80'
      : 'bg-red-500/10 text-red-400/60';
  }
  return 'bg-gray-500/10 text-gray-400';
}

function IndicatorCard({ indicator }: { indicator: IndicatorDetail }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all cursor-pointer hover:border-primary/50',
        indicator.signal === 'bullish'
          ? 'bg-green-500/5 border-green-500/20'
          : indicator.signal === 'bearish'
          ? 'bg-red-500/5 border-red-500/20'
          : 'bg-muted/30 border-border/50'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getSignalIcon(indicator.signal)}
          <span className="font-medium text-sm">{indicator.name}</span>
          {indicator.isLeadingIndicator && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400 rounded">
              LEADING
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              getSignalBadgeClass(indicator.signal, indicator.signalStrength)
            )}
          >
            {indicator.signal.toUpperCase()}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Value:</span>
        <span className="font-mono font-medium">
          {typeof indicator.value === 'number'
            ? indicator.value.toFixed(2)
            : indicator.value ?? 'N/A'}
        </span>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground leading-relaxed">
              {indicator.interpretation}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Strength: {indicator.signalStrength}</span>
            <span>Weight: {(indicator.weight * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  indicators,
}: {
  category: keyof typeof CATEGORY_CONFIG;
  indicators: Record<string, IndicatorDetail | undefined>;
}) {
  const [expanded, setExpanded] = useState(true);
  const config = CATEGORY_CONFIG[category];
  const colors = colorClasses[config.color as keyof typeof colorClasses];
  const Icon = config.icon;

  const indicatorList = Object.values(indicators).filter(
    (i): i is IndicatorDetail => i !== undefined
  );

  if (indicatorList.length === 0) return null;

  const bullishCount = indicatorList.filter((i) => i.signal === 'bullish').length;
  const bearishCount = indicatorList.filter((i) => i.signal === 'bearish').length;

  return (
    <div className={cn('rounded-lg border', colors.border)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full p-3 flex items-center justify-between',
          colors.bg,
          'rounded-t-lg hover:opacity-90 transition-opacity'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-1.5 rounded', colors.bg)}>
            <Icon className={cn('w-4 h-4', colors.text)} />
          </div>
          <span className="font-medium">{config.label}</span>
          <span className="text-xs text-muted-foreground">
            ({indicatorList.length} indicators)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-500">{bullishCount} bullish</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-red-500">{bearishCount} bearish</span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {indicatorList.map((indicator) => (
            <IndicatorCard key={indicator.name} indicator={indicator} />
          ))}
        </div>
      )}
    </div>
  );
}

export function IndicatorDetails({ data, title = 'Indicator Analysis', compact = false }: IndicatorDetailsProps) {
  const [showAll, setShowAll] = useState(!compact);

  if (!data) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg text-center">
        <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No indicator data available</p>
      </div>
    );
  }

  const { summary, divergences } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAll ? 'Collapse' : 'Expand All'}
        </button>
      </div>

      {/* Summary Card */}
      <div className="p-4 bg-card rounded-lg border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                summary.overallSignal === 'bullish'
                  ? 'bg-green-500/20'
                  : summary.overallSignal === 'bearish'
                  ? 'bg-red-500/20'
                  : 'bg-gray-500/20'
              )}
            >
              {summary.overallSignal === 'bullish' ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : summary.overallSignal === 'bearish' ? (
                <TrendingDown className="w-8 h-8 text-red-500" />
              ) : (
                <Minus className="w-8 h-8 text-gray-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overall Signal</p>
              <p
                className={cn(
                  'text-2xl font-bold capitalize',
                  summary.overallSignal === 'bullish'
                    ? 'text-green-500'
                    : summary.overallSignal === 'bearish'
                    ? 'text-red-500'
                    : 'text-gray-500'
                )}
              >
                {summary.overallSignal}
              </p>
              <p className="text-xs text-muted-foreground">
                Confidence: {summary.signalConfidence}%
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{summary.bullishIndicators}</p>
              <p className="text-xs text-muted-foreground">Bullish</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{summary.bearishIndicators}</p>
              <p className="text-xs text-muted-foreground">Bearish</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-500">{summary.neutralIndicators}</p>
              <p className="text-xs text-muted-foreground">Neutral</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.totalIndicatorsUsed}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        {/* Leading Indicators Signal */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">Leading Indicators Signal:</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                summary.leadingIndicatorsSignal === 'bullish'
                  ? 'bg-green-500/20 text-green-400'
                  : summary.leadingIndicatorsSignal === 'bearish'
                  ? 'bg-red-500/20 text-red-400'
                  : summary.leadingIndicatorsSignal === 'mixed'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-gray-500/20 text-gray-400'
              )}
            >
              {summary.leadingIndicatorsSignal.toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              (Early warning signals from momentum divergences, order flow, volume)
            </span>
          </div>
        </div>
      </div>

      {/* Divergences Warning */}
      {divergences.length > 0 && (
        <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="font-medium text-amber-500">Divergences Detected (Early Signals)</span>
          </div>
          <div className="space-y-2">
            {divergences.map((div, i) => {
              const isBullish = div.type === 'bullish' || div.type === 'hidden_bullish';
              const isBearish = div.type === 'bearish' || div.type === 'hidden_bearish';
              const displayType = div.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

              return (
              <div key={i} className="flex items-start gap-2 text-sm">
                {isBullish ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                ) : isBearish ? (
                  <TrendingDown className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <span
                    className={cn(
                      'font-medium',
                      isBullish ? 'text-green-500' : isBearish ? 'text-red-500' : 'text-gray-500'
                    )}
                  >
                    {displayType} {div.indicator} Divergence
                  </span>
                  <span className="text-muted-foreground"> - </span>
                  <span>{div.description}</span>
                  <span
                    className={cn(
                      'ml-2 px-1.5 py-0.5 text-[10px] rounded',
                      div.reliability === 'high'
                        ? 'bg-green-500/20 text-green-400'
                        : div.reliability === 'medium'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-gray-500/20 text-gray-400'
                    )}
                  >
                    {div.reliability.toUpperCase()} reliability
                  </span>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* Category Sections */}
      {showAll && (
        <div className="space-y-3">
          <CategorySection category="trend" indicators={data.trend} />
          <CategorySection category="momentum" indicators={data.momentum} />
          <CategorySection category="volatility" indicators={data.volatility} />
          <CategorySection category="volume" indicators={data.volume} />
          <CategorySection category="advanced" indicators={data.advanced} />
        </div>
      )}
    </div>
  );
}
