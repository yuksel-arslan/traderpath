'use client';

import { ArrowUp, ArrowDown, Minus, Target, AlertTriangle, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

type Verdict = 'go' | 'conditional_go' | 'wait' | 'avoid';
type Direction = 'long' | 'short' | null;
type Recommendation = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

interface TradeDecisionVisualProps {
  // For Classic 7-Step Analysis
  verdict?: Verdict;
  direction?: Direction;
  score?: number; // 0-100 scale (will be displayed as X/100)

  // For MLIS Pro Analysis
  recommendation?: Recommendation;
  confidence?: number; // 0-100 scale
  riskLevel?: 'low' | 'medium' | 'high';
  isMLISPro?: boolean;

  // Common
  symbol?: string;
  showDirectionArrow?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'compact';
}

// Verdict Badge
function VerdictBadge({
  verdict,
  recommendation,
  size = 'md'
}: {
  verdict?: Verdict;
  recommendation?: Recommendation;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeConfig = {
    sm: { container: 'px-2.5 py-1', icon: 'w-3.5 h-3.5', text: 'text-xs' },
    md: { container: 'px-3 py-1.5', icon: 'w-4 h-4', text: 'text-sm' },
    lg: { container: 'px-4 py-2', icon: 'w-5 h-5', text: 'text-base' }
  };

  const config = sizeConfig[size];

  const getVerdictConfig = () => {
    if (recommendation) {
      switch (recommendation) {
        case 'STRONG_BUY':
          return { label: 'STRONG BUY', icon: <TrendingUp className={config.icon} />, bg: 'bg-green-500', text: 'text-white' };
        case 'BUY':
          return { label: 'BUY', icon: <ArrowUp className={config.icon} />, bg: 'bg-green-500', text: 'text-white' };
        case 'HOLD':
          return { label: 'HOLD', icon: <Minus className={config.icon} />, bg: 'bg-amber-500', text: 'text-white' };
        case 'SELL':
          return { label: 'SELL', icon: <ArrowDown className={config.icon} />, bg: 'bg-red-500', text: 'text-white' };
        case 'STRONG_SELL':
          return { label: 'STRONG SELL', icon: <TrendingDown className={config.icon} />, bg: 'bg-red-500', text: 'text-white' };
      }
    }

    switch (verdict) {
      case 'go':
        return { label: 'GO', icon: <TrendingUp className={config.icon} />, bg: 'bg-green-500', text: 'text-white' };
      case 'conditional_go':
        return { label: 'CONDITIONAL', icon: <Target className={config.icon} />, bg: 'bg-teal-500', text: 'text-white' };
      case 'wait':
        return { label: 'WAIT', icon: <AlertTriangle className={config.icon} />, bg: 'bg-amber-500', text: 'text-white' };
      case 'avoid':
        return { label: 'AVOID', icon: <TrendingDown className={config.icon} />, bg: 'bg-red-500', text: 'text-white' };
      default:
        return { label: 'UNKNOWN', icon: <Minus className={config.icon} />, bg: 'bg-gray-400 dark:bg-gray-600', text: 'text-white' };
    }
  };

  const verdictConfig = getVerdictConfig();

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-md font-semibold",
      config.container,
      verdictConfig.bg,
      verdictConfig.text
    )}>
      {verdictConfig.icon}
      <span className={config.text}>{verdictConfig.label}</span>
    </span>
  );
}

// Signal Strength Indicator (simplified bar segments)
function SignalBar({
  verdict,
  recommendation,
  size = 'md'
}: {
  verdict?: Verdict;
  recommendation?: Recommendation;
  size?: 'sm' | 'md' | 'lg';
}) {
  const getSignalLevel = () => {
    if (recommendation) {
      if (recommendation === 'STRONG_BUY') return { level: 4, color: 'bg-green-500', label: 'Strong' };
      if (recommendation === 'BUY') return { level: 3, color: 'bg-green-500', label: 'Bullish' };
      if (recommendation === 'HOLD') return { level: 2, color: 'bg-amber-500', label: 'Neutral' };
      if (recommendation === 'SELL') return { level: 1, color: 'bg-red-500', label: 'Bearish' };
      return { level: 0, color: 'bg-red-500', label: 'Strong Sell' };
    }
    if (verdict) {
      if (verdict === 'go') return { level: 4, color: 'bg-green-500', label: 'Strong' };
      if (verdict === 'conditional_go') return { level: 3, color: 'bg-teal-500', label: 'Conditional' };
      if (verdict === 'wait') return { level: 2, color: 'bg-amber-500', label: 'Neutral' };
      return { level: 1, color: 'bg-red-500', label: 'Weak' };
    }
    return { level: 2, color: 'bg-gray-400', label: 'Unknown' };
  };

  const signal = getSignalLevel();
  const widthMap = { sm: 'w-24', md: 'w-32', lg: 'w-40' };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn("flex items-center gap-0.5", widthMap[size])}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-1.5 rounded-full transition-colors",
              (3 - i) < signal.level ? signal.color : 'bg-gray-200 dark:bg-gray-700'
            )}
          />
        ))}
      </div>
      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {signal.label}
      </span>
    </div>
  );
}

// Direction Indicator
function DirectionIndicator({
  direction,
  size = 'md'
}: {
  direction: Direction;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeConfig = {
    sm: { container: 'w-12 h-12', icon: 'w-5 h-5', text: 'text-[9px]' },
    md: { container: 'w-16 h-16', icon: 'w-6 h-6', text: 'text-[10px]' },
    lg: { container: 'w-20 h-20', icon: 'w-7 h-7', text: 'text-xs' }
  };

  const config = sizeConfig[size];

  if (!direction) {
    return (
      <div className={cn("flex flex-col items-center justify-center rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600", config.container)}>
        <Minus className={cn("text-gray-400", config.icon)} />
        <span className={cn("font-semibold text-gray-400 mt-0.5", config.text)}>NEUTRAL</span>
      </div>
    );
  }

  const isLong = direction === 'long';

  return (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-full border-2",
      isLong ? "border-green-500 bg-green-50 dark:bg-green-500/10" : "border-red-500 bg-red-50 dark:bg-red-500/10",
      config.container
    )}>
      {isLong ? (
        <ArrowUp className={cn("text-green-600 dark:text-green-400", config.icon)} strokeWidth={2.5} />
      ) : (
        <ArrowDown className={cn("text-red-600 dark:text-red-400", config.icon)} strokeWidth={2.5} />
      )}
      <span className={cn(
        "font-bold mt-0.5",
        config.text,
        isLong ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}>
        {isLong ? 'LONG' : 'SHORT'}
      </span>
    </div>
  );
}

// Score Display
function ScoreGauge({
  score,
  maxScore = 100,
  size = 'md',
  label = 'Score',
  showPercentage = false
}: {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showPercentage?: boolean;
}) {
  const safeScore = typeof score === 'number' && !isNaN(score) ? score : 0;
  const percentage = Math.min(100, Math.max(0, (safeScore / maxScore) * 100));

  const sizeConfig = {
    sm: { numSize: 'text-lg', labelSize: 'text-[9px]' },
    md: { numSize: 'text-2xl', labelSize: 'text-[10px]' },
    lg: { numSize: 'text-3xl', labelSize: 'text-xs' }
  };

  const config = sizeConfig[size];

  const getColor = () => {
    if (percentage >= 70) return 'text-green-600 dark:text-green-400';
    if (percentage >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getBarColor = () => {
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn("font-mono font-bold tabular-nums", config.numSize, getColor())}>
        {showPercentage ? `${Math.round(safeScore)}%` : safeScore.toFixed(1)}
      </span>
      {!showPercentage && (
        <span className="text-gray-500 dark:text-gray-400 text-[10px] font-medium">/ {maxScore}</span>
      )}
      {/* Progress bar */}
      <div className="w-16 h-1 rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn("text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider", config.labelSize)}>
        {label}
      </span>
    </div>
  );
}

// Risk Level Indicator
function RiskIndicator({
  riskLevel,
  size = 'md'
}: {
  riskLevel: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md' | 'lg';
}) {
  const getRiskConfig = () => {
    switch (riskLevel) {
      case 'low':
        return { label: 'Low Risk', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-800' };
      case 'medium':
        return { label: 'Medium Risk', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-800' };
      case 'high':
        return { label: 'High Risk', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-800' };
    }
  };

  const riskConfig = getRiskConfig();

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium",
      riskConfig.bg, riskConfig.border, riskConfig.color
    )}>
      <Shield className="w-3.5 h-3.5" />
      {riskConfig.label}
    </span>
  );
}

// Main Component
export function TradeDecisionVisual({
  verdict,
  direction,
  score = 0,
  recommendation,
  confidence,
  riskLevel,
  isMLISPro,
  symbol,
  showDirectionArrow = true,
  size = 'md',
  variant = 'full'
}: TradeDecisionVisualProps) {
  const isMLIS = isMLISPro ?? (confidence !== undefined || riskLevel !== undefined);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#111111]">
        <VerdictBadge verdict={verdict} recommendation={recommendation} size="sm" />
        {showDirectionArrow && <DirectionIndicator direction={direction || null} size="sm" />}
        <div className="text-right ml-auto">
          <span className={cn(
            "text-sm font-mono font-bold",
            score >= 70 ? "text-green-600 dark:text-green-400" : score >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
          )}>
            {score.toFixed(1)}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400"> / 100</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#111111]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {symbol ? `${symbol} ` : ''}Trade Decision
          </h3>
          {isMLIS && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30">
              MLIS PRO
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 items-center justify-items-center">
          {/* Verdict */}
          <div className="flex flex-col items-center gap-2">
            <VerdictBadge verdict={verdict} recommendation={recommendation} size={size} />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Verdict</span>
          </div>

          {/* Direction */}
          {showDirectionArrow && (
            <div className="flex flex-col items-center gap-2">
              <DirectionIndicator direction={direction || null} size={size} />
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Direction</span>
            </div>
          )}

          {/* Score */}
          <div className="flex flex-col items-center gap-1">
            {isMLIS && confidence !== undefined ? (
              <ScoreGauge score={confidence} maxScore={100} size={size} label="Confidence" showPercentage />
            ) : (
              <ScoreGauge score={score} maxScore={100} size={size} label="Score" />
            )}
          </div>

          {/* Signal Strength */}
          <div className="flex flex-col items-center gap-2">
            <SignalBar verdict={verdict} recommendation={recommendation} size={size} />
          </div>
        </div>

        {/* Risk Level for MLIS */}
        {riskLevel && (
          <div className="flex justify-center mt-5 pt-4 border-t border-gray-200 dark:border-gray-800">
            <RiskIndicator riskLevel={riskLevel} size={size} />
          </div>
        )}
      </div>
    </div>
  );
}

// Export sub-components for individual use
export { SignalBar as SignalIndicator, DirectionIndicator as DirectionArrow, ScoreGauge, RiskIndicator as RiskMeter, VerdictBadge };
