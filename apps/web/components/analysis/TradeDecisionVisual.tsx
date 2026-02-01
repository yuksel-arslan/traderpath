'use client';

import { ArrowUp, ArrowDown, Minus, Target, Shield, AlertTriangle, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect, useState } from 'react';

type Verdict = 'go' | 'conditional_go' | 'wait' | 'avoid';
type Direction = 'long' | 'short' | null;
type Recommendation = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

interface TradeDecisionVisualProps {
  // For Classic 7-Step Analysis
  verdict?: Verdict;
  direction?: Direction;
  score?: number; // 0-100 scale (will be displayed as X/100)

  // For MLIS Pro Analysis
  recommendation?: Recommendation; // Optional: if provided, shows MLIS-style badge
  confidence?: number; // 0-100 scale
  riskLevel?: 'low' | 'medium' | 'high';
  isMLISPro?: boolean; // Explicit flag to indicate MLIS Pro analysis

  // Common
  symbol?: string;
  showDirectionArrow?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'compact';
}

// Traffic Light Signal Indicator
function SignalIndicator({
  verdict,
  recommendation,
  size = 'md'
}: {
  verdict?: Verdict;
  recommendation?: Recommendation;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const containerClasses = {
    sm: 'gap-1.5 p-2',
    md: 'gap-2 p-3',
    lg: 'gap-3 p-4'
  };

  // Determine active light based on verdict or recommendation
  const getActiveLight = () => {
    if (recommendation) {
      if (recommendation === 'STRONG_BUY' || recommendation === 'BUY') return 'green';
      if (recommendation === 'HOLD') return 'yellow';
      return 'red';
    }
    if (verdict) {
      if (verdict === 'go') return 'green';
      if (verdict === 'conditional_go') return 'blue';
      if (verdict === 'wait') return 'yellow';
      return 'red';
    }
    return null;
  };

  const activeLight = getActiveLight();

  return (
    <div className={cn(
      "flex flex-col items-center bg-slate-900/80 dark:bg-slate-950/80 rounded-2xl border border-slate-700/50 backdrop-blur-sm",
      containerClasses[size]
    )}>
      {/* Green light */}
      <div className={cn(
        "rounded-full transition-all duration-500",
        sizeClasses[size],
        activeLight === 'green'
          ? "bg-green-500 shadow-[0_0_20px_4px_rgba(34,197,94,0.6)] animate-pulse"
          : "bg-green-900/30 border border-green-800/30"
      )} />

      {/* Blue light (for conditional) */}
      <div className={cn(
        "rounded-full transition-all duration-500",
        sizeClasses[size],
        activeLight === 'blue'
          ? "bg-blue-500 shadow-[0_0_20px_4px_rgba(59,130,246,0.6)] animate-pulse"
          : "bg-blue-900/30 border border-blue-800/30"
      )} />

      {/* Yellow light */}
      <div className={cn(
        "rounded-full transition-all duration-500",
        sizeClasses[size],
        activeLight === 'yellow'
          ? "bg-yellow-500 shadow-[0_0_20px_4px_rgba(234,179,8,0.6)] animate-pulse"
          : "bg-yellow-900/30 border border-yellow-800/30"
      )} />

      {/* Red light */}
      <div className={cn(
        "rounded-full transition-all duration-500",
        sizeClasses[size],
        activeLight === 'red'
          ? "bg-red-500 shadow-[0_0_20px_4px_rgba(239,68,68,0.6)] animate-pulse"
          : "bg-red-900/30 border border-red-800/30"
      )} />
    </div>
  );
}

// Direction Arrow Indicator
function DirectionArrow({
  direction,
  size = 'md',
  animated = true
}: {
  direction: Direction;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}) {
  const sizeClasses = {
    sm: { container: 'w-16 h-16', icon: 'w-8 h-8', text: 'text-xs' },
    md: { container: 'w-24 h-24', icon: 'w-12 h-12', text: 'text-sm' },
    lg: { container: 'w-32 h-32', icon: 'w-16 h-16', text: 'text-base' }
  };

  if (!direction) {
    return (
      <div className={cn(
        "relative rounded-full flex flex-col items-center justify-center",
        "bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/30",
        sizeClasses[size].container
      )}>
        <Minus className={cn("text-slate-400", sizeClasses[size].icon)} />
        <span className={cn("font-bold text-slate-400 mt-1", sizeClasses[size].text)}>NEUTRAL</span>
      </div>
    );
  }

  const isLong = direction === 'long';

  return (
    <div className={cn(
      "relative rounded-full flex flex-col items-center justify-center overflow-hidden",
      sizeClasses[size].container,
      isLong
        ? "bg-gradient-to-br from-green-600/20 to-green-800/20 border-2 border-green-500/50"
        : "bg-gradient-to-br from-red-600/20 to-red-800/20 border-2 border-red-500/50",
      animated && "animate-pulse"
    )}>
      {/* Glow effect */}
      <div className={cn(
        "absolute inset-0 rounded-full blur-xl opacity-50",
        isLong ? "bg-green-500/30" : "bg-red-500/30"
      )} />

      {/* Arrow and text */}
      <div className="relative z-10 flex flex-col items-center">
        {isLong ? (
          <ArrowUp className={cn(
            "text-green-400",
            sizeClasses[size].icon,
            animated && "animate-bounce"
          )} />
        ) : (
          <ArrowDown className={cn(
            "text-red-400",
            sizeClasses[size].icon,
            animated && "animate-bounce"
          )} />
        )}
        <span className={cn(
          "font-black mt-1",
          sizeClasses[size].text,
          isLong ? "text-green-400" : "text-red-400"
        )}>
          {isLong ? 'LONG' : 'SHORT'}
        </span>
      </div>
    </div>
  );
}

// Circular Score Gauge
function ScoreGauge({
  score,
  maxScore = 10,
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
  // Ensure score is a valid number
  const safeScore = typeof score === 'number' && !isNaN(score) ? score : 0;
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    // Animate the score on mount
    const timer = setTimeout(() => {
      setAnimatedScore(safeScore);
    }, 100);
    return () => clearTimeout(timer);
  }, [safeScore]);

  const percentage = (animatedScore / maxScore) * 100;

  const sizeConfig = {
    sm: { size: 80, strokeWidth: 6, radius: 32, fontSize: 'text-lg', labelSize: 'text-[9px]' },
    md: { size: 120, strokeWidth: 8, radius: 48, fontSize: 'text-2xl', labelSize: 'text-[10px]' },
    lg: { size: 160, strokeWidth: 10, radius: 64, fontSize: 'text-4xl', labelSize: 'text-xs' }
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Color based on score
  const getColor = () => {
    const normalizedScore = (safeScore / maxScore) * 10;
    if (normalizedScore >= 7) return { stroke: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)', text: 'text-green-400' };
    if (normalizedScore >= 5) return { stroke: '#eab308', glow: 'rgba(234, 179, 8, 0.5)', text: 'text-yellow-400' };
    return { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', text: 'text-red-400' };
  };

  const color = getColor();

  return (
    <div className="relative" style={{ width: config.size, height: config.size }}>
      {/* Glow effect */}
      <div
        className="absolute inset-4 rounded-full blur-xl opacity-60"
        style={{ backgroundColor: color.glow }}
      />

      {/* SVG Gauge */}
      <svg
        className="transform -rotate-90 relative z-10"
        width={config.size}
        height={config.size}
      >
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={config.radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-slate-700/50"
        />

        {/* Progress circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={config.radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 12px ${color.glow})`
          }}
        />

        {/* Tick marks */}
        {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((angle) => (
          <line
            key={angle}
            x1={config.size / 2 + (config.radius - 8) * Math.cos((angle - 90) * Math.PI / 180)}
            y1={config.size / 2 + (config.radius - 8) * Math.sin((angle - 90) * Math.PI / 180)}
            x2={config.size / 2 + (config.radius - 4) * Math.cos((angle - 90) * Math.PI / 180)}
            y2={config.size / 2 + (config.radius - 4) * Math.sin((angle - 90) * Math.PI / 180)}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-slate-600/50"
          />
        ))}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className={cn("font-black", config.fontSize, color.text)}>
          {showPercentage ? `${Math.round(percentage)}%` : animatedScore.toFixed(1)}
        </span>
        {!showPercentage && <span className="text-slate-500 text-xs">/{maxScore}</span>}
        <span className={cn("text-slate-400 font-medium mt-0.5", config.labelSize)}>{label}</span>
      </div>
    </div>
  );
}

// Risk Level Meter
function RiskMeter({
  riskLevel,
  size = 'md'
}: {
  riskLevel: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md' | 'lg';
}) {
  const levels = ['low', 'medium', 'high'] as const;
  const activeIndex = levels.indexOf(riskLevel);

  const sizeConfig = {
    sm: { bar: 'h-1.5 w-8', text: 'text-[10px]', gap: 'gap-1' },
    md: { bar: 'h-2 w-12', text: 'text-xs', gap: 'gap-1.5' },
    lg: { bar: 'h-3 w-16', text: 'text-sm', gap: 'gap-2' }
  };

  const config = sizeConfig[size];

  const getColor = (level: string, isActive: boolean) => {
    if (!isActive) return 'bg-slate-700/50';
    if (level === 'low') return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
    if (level === 'medium') return 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
    return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
  };

  const getRiskColor = () => {
    if (riskLevel === 'low') return 'text-green-400';
    if (riskLevel === 'medium') return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-0.5 mb-1">
        <Shield className={cn("w-3.5 h-3.5", getRiskColor())} />
        <span className={cn("font-semibold uppercase", config.text, getRiskColor())}>
          {riskLevel} Risk
        </span>
      </div>
      <div className={cn("flex items-center", config.gap)}>
        {levels.map((level, i) => (
          <div
            key={level}
            className={cn(
              "rounded-full transition-all duration-500",
              config.bar,
              getColor(level, i <= activeIndex)
            )}
          />
        ))}
      </div>
    </div>
  );
}

// Verdict Badge with Icon
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
    sm: { container: 'px-3 py-1.5', icon: 'w-4 h-4', text: 'text-sm' },
    md: { container: 'px-5 py-2.5', icon: 'w-6 h-6', text: 'text-lg' },
    lg: { container: 'px-7 py-3.5', icon: 'w-8 h-8', text: 'text-2xl' }
  };

  const config = sizeConfig[size];

  const getVerdictConfig = () => {
    // MLIS Pro recommendations
    if (recommendation) {
      switch (recommendation) {
        case 'STRONG_BUY':
          return {
            label: 'STRONG BUY',
            icon: <TrendingUp className={cn(config.icon)} />,
            bg: 'bg-gradient-to-r from-green-600 to-emerald-500',
            border: 'border-green-400/50',
            glow: 'shadow-[0_0_30px_rgba(34,197,94,0.4)]'
          };
        case 'BUY':
          return {
            label: 'BUY',
            icon: <ArrowUp className={cn(config.icon)} />,
            bg: 'bg-gradient-to-r from-green-500 to-green-400',
            border: 'border-green-300/50',
            glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]'
          };
        case 'HOLD':
          return {
            label: 'HOLD',
            icon: <Minus className={cn(config.icon)} />,
            bg: 'bg-gradient-to-r from-amber-500 to-yellow-400',
            border: 'border-amber-300/50',
            glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]'
          };
        case 'SELL':
          return {
            label: 'SELL',
            icon: <ArrowDown className={cn(config.icon)} />,
            bg: 'bg-gradient-to-r from-red-500 to-red-400',
            border: 'border-red-300/50',
            glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]'
          };
        case 'STRONG_SELL':
          return {
            label: 'STRONG SELL',
            icon: <TrendingDown className={cn(config.icon)} />,
            bg: 'bg-gradient-to-r from-red-600 to-rose-500',
            border: 'border-red-400/50',
            glow: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]'
          };
      }
    }

    // Classic verdicts
    switch (verdict) {
      case 'go':
        return {
          label: 'GO',
          icon: <TrendingUp className={cn(config.icon)} />,
          bg: 'bg-gradient-to-r from-green-600 to-emerald-500',
          border: 'border-green-400/50',
          glow: 'shadow-[0_0_30px_rgba(34,197,94,0.4)]'
        };
      case 'conditional_go':
        return {
          label: 'CONDITIONAL GO',
          icon: <Target className={cn(config.icon)} />,
          bg: 'bg-gradient-to-r from-blue-600 to-blue-500',
          border: 'border-blue-400/50',
          glow: 'shadow-[0_0_25px_rgba(59,130,246,0.4)]'
        };
      case 'wait':
        return {
          label: 'WAIT',
          icon: <AlertTriangle className={cn(config.icon)} />,
          bg: 'bg-gradient-to-r from-amber-500 to-yellow-400',
          border: 'border-amber-300/50',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]'
        };
      case 'avoid':
        return {
          label: 'AVOID',
          icon: <TrendingDown className={cn(config.icon)} />,
          bg: 'bg-gradient-to-r from-red-600 to-rose-500',
          border: 'border-red-400/50',
          glow: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]'
        };
      default:
        return {
          label: 'UNKNOWN',
          icon: <Minus className={cn(config.icon)} />,
          bg: 'bg-gradient-to-r from-slate-600 to-slate-500',
          border: 'border-slate-400/50',
          glow: ''
        };
    }
  };

  const verdictConfig = getVerdictConfig();

  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-xl font-black text-white border",
      config.container,
      verdictConfig.bg,
      verdictConfig.border,
      verdictConfig.glow
    )}>
      {verdictConfig.icon}
      <span className={config.text}>{verdictConfig.label}</span>
    </div>
  );
}

// Main Component - Full Trade Decision Visual
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
  // Determine if this is MLIS Pro or Classic
  // Use explicit flag if provided, otherwise infer from confidence/riskLevel presence
  const isMLIS = isMLISPro ?? (confidence !== undefined || riskLevel !== undefined);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3">
        <SignalIndicator verdict={verdict} recommendation={recommendation} size="sm" />
        <VerdictBadge verdict={verdict} recommendation={recommendation} size="sm" />
        {showDirectionArrow && direction && <DirectionArrow direction={direction} size="sm" animated={false} />}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-slate-950/50 rounded-2xl blur-xl" />

      <div className="relative bg-card/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 overflow-hidden">
        {/* Header */}
        {symbol && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="text-lg font-bold text-white">{symbol} Trade Decision</span>
            {isMLIS && (
              <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-[10px] font-bold rounded-full border border-violet-500/30">
                MLIS PRO
              </span>
            )}
          </div>
        )}

        {/* Main visual section */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {/* Signal Indicator (Traffic Light) */}
          <div className="flex flex-col items-center">
            <SignalIndicator verdict={verdict} recommendation={recommendation} size={size} />
            <span className="text-[10px] text-slate-500 mt-2 font-medium">SIGNAL</span>
          </div>

          {/* Verdict Badge */}
          <div className="flex flex-col items-center">
            <VerdictBadge verdict={verdict} recommendation={recommendation} size={size} />
            <span className="text-[10px] text-slate-500 mt-2 font-medium">VERDICT</span>
          </div>

          {/* Direction Arrow */}
          {showDirectionArrow && (
            <div className="flex flex-col items-center">
              <DirectionArrow direction={direction || null} size={size} />
              <span className="text-[10px] text-slate-500 mt-2 font-medium">DIRECTION</span>
            </div>
          )}

          {/* Score Gauge - Always use 0-100 scale for consistency */}
          <div className="flex flex-col items-center">
            {isMLIS && confidence !== undefined ? (
              <ScoreGauge
                score={confidence}
                maxScore={100}
                size={size}
                label="Confidence"
                showPercentage
              />
            ) : (
              <ScoreGauge score={score} maxScore={100} size={size} label="Score" />
            )}
          </div>
        </div>

        {/* Risk Level (for MLIS) */}
        {riskLevel && (
          <div className="flex justify-center mt-4 pt-4 border-t border-slate-700/50">
            <RiskMeter riskLevel={riskLevel} size={size} />
          </div>
        )}
      </div>
    </div>
  );
}

// Export sub-components for individual use
export { SignalIndicator, DirectionArrow, ScoreGauge, RiskMeter, VerdictBadge };
