'use client';

import { ArrowUp, ArrowDown, Minus, Target, Shield, AlertTriangle, TrendingUp, TrendingDown, Zap, Activity, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect, useState, useRef } from 'react';

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

// Premium Signal Bar - Replaces traffic light
function SignalBar({
  verdict,
  recommendation,
  size = 'md'
}: {
  verdict?: Verdict;
  recommendation?: Recommendation;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeConfig = {
    sm: { width: 'w-32', height: 'h-2', dotSize: 'w-3 h-3' },
    md: { width: 'w-48', height: 'h-2.5', dotSize: 'w-4 h-4' },
    lg: { width: 'w-64', height: 'h-3', dotSize: 'w-5 h-5' }
  };

  const config = sizeConfig[size];

  const getSignalLevel = () => {
    if (recommendation) {
      if (recommendation === 'STRONG_BUY') return { level: 4, color: 'emerald', label: 'Strong' };
      if (recommendation === 'BUY') return { level: 3, color: 'green', label: 'Bullish' };
      if (recommendation === 'HOLD') return { level: 2, color: 'amber', label: 'Neutral' };
      if (recommendation === 'SELL') return { level: 1, color: 'orange', label: 'Bearish' };
      return { level: 0, color: 'red', label: 'Strong Sell' };
    }
    if (verdict) {
      if (verdict === 'go') return { level: 4, color: 'emerald', label: 'Strong' };
      if (verdict === 'conditional_go') return { level: 3, color: 'blue', label: 'Conditional' };
      if (verdict === 'wait') return { level: 2, color: 'amber', label: 'Neutral' };
      return { level: 1, color: 'red', label: 'Weak' };
    }
    return { level: 2, color: 'slate', label: 'Unknown' };
  };

  const signal = getSignalLevel();
  const segments = 4;

  const getSegmentColor = (index: number) => {
    if (index >= signal.level) return 'bg-slate-700/30';
    const colors: Record<string, string> = {
      emerald: 'bg-emerald-500',
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      amber: 'bg-amber-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      slate: 'bg-slate-500'
    };
    return colors[signal.color] || 'bg-slate-500';
  };

  const getGlowColor = () => {
    const glows: Record<string, string> = {
      emerald: 'shadow-emerald-500/50',
      green: 'shadow-green-500/50',
      blue: 'shadow-blue-500/50',
      amber: 'shadow-amber-500/50',
      orange: 'shadow-orange-500/50',
      red: 'shadow-red-500/50',
      slate: ''
    };
    return glows[signal.color] || '';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("flex items-center gap-1 rounded-full bg-slate-900/60 p-1.5 backdrop-blur-sm border border-slate-700/50", config.width)}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-all duration-500",
              config.height,
              getSegmentColor(segments - 1 - i),
              i < signal.level && `shadow-lg ${getGlowColor()}`
            )}
          />
        ))}
      </div>
      <span className={cn(
        "text-[10px] font-medium uppercase tracking-wider",
        signal.color === 'emerald' && 'text-emerald-400',
        signal.color === 'green' && 'text-green-400',
        signal.color === 'blue' && 'text-blue-400',
        signal.color === 'amber' && 'text-amber-400',
        signal.color === 'orange' && 'text-orange-400',
        signal.color === 'red' && 'text-red-400',
        signal.color === 'slate' && 'text-slate-400'
      )}>
        {signal.label} Signal
      </span>
    </div>
  );
}

// Premium Direction Indicator
function DirectionIndicator({
  direction,
  size = 'md'
}: {
  direction: Direction;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeConfig = {
    sm: { container: 'w-20 h-20', icon: 'w-6 h-6', text: 'text-xs', arrow: 'w-8 h-8' },
    md: { container: 'w-28 h-28', icon: 'w-8 h-8', text: 'text-sm', arrow: 'w-10 h-10' },
    lg: { container: 'w-36 h-36', icon: 'w-10 h-10', text: 'text-base', arrow: 'w-12 h-12' }
  };

  const config = sizeConfig[size];

  if (!direction) {
    return (
      <div className={cn(
        "relative flex flex-col items-center justify-center",
        config.container
      )}>
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-2 border-slate-600/50 border-dashed animate-[spin_20s_linear_infinite]" />

        {/* Inner content */}
        <div className="relative z-10 flex flex-col items-center justify-center bg-slate-800/80 rounded-full w-[85%] h-[85%] backdrop-blur-sm border border-slate-700/50">
          <Minus className={cn("text-slate-400", config.arrow)} />
          <span className={cn("font-bold text-slate-400 mt-1", config.text)}>NEUTRAL</span>
        </div>
      </div>
    );
  }

  const isLong = direction === 'long';
  const baseColor = isLong ? 'emerald' : 'red';

  return (
    <div className={cn("relative flex flex-col items-center justify-center", config.container)}>
      {/* Animated outer ring */}
      <div className={cn(
        "absolute inset-0 rounded-full",
        isLong
          ? "bg-gradient-to-b from-emerald-500/20 via-transparent to-emerald-500/20"
          : "bg-gradient-to-b from-red-500/20 via-transparent to-red-500/20",
        "animate-[spin_4s_linear_infinite]"
      )} />

      {/* Pulse ring */}
      <div className={cn(
        "absolute inset-2 rounded-full animate-ping opacity-20",
        isLong ? "bg-emerald-500" : "bg-red-500"
      )} style={{ animationDuration: '2s' }} />

      {/* Main content */}
      <div className={cn(
        "relative z-10 flex flex-col items-center justify-center rounded-full w-[85%] h-[85%] backdrop-blur-sm border-2",
        isLong
          ? "bg-gradient-to-br from-emerald-950/80 to-emerald-900/60 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          : "bg-gradient-to-br from-red-950/80 to-red-900/60 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
      )}>
        {/* Arrow with animation */}
        <div className={cn(
          "transition-transform",
          isLong ? "animate-[bounce_1s_ease-in-out_infinite]" : "animate-[bounce_1s_ease-in-out_infinite_reverse]"
        )}>
          {isLong ? (
            <ArrowUp className={cn("text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]", config.arrow)} strokeWidth={3} />
          ) : (
            <ArrowDown className={cn("text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]", config.arrow)} strokeWidth={3} />
          )}
        </div>
        <span className={cn(
          "font-black tracking-wider mt-1",
          config.text,
          isLong ? "text-emerald-400" : "text-red-400"
        )}>
          {isLong ? 'LONG' : 'SHORT'}
        </span>
      </div>
    </div>
  );
}

// Premium Score Gauge with modern design
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
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setAnimatedScore(safeScore);
    }, 200);
    return () => clearTimeout(timer);
  }, [safeScore]);

  const percentage = (animatedScore / maxScore) * 100;

  const sizeConfig = {
    sm: { size: 90, strokeWidth: 8, radius: 36, fontSize: 'text-xl', labelSize: 'text-[9px]' },
    md: { size: 130, strokeWidth: 10, radius: 52, fontSize: 'text-3xl', labelSize: 'text-[10px]' },
    lg: { size: 170, strokeWidth: 12, radius: 68, fontSize: 'text-4xl', labelSize: 'text-xs' }
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (safeScore >= 70) return {
      stroke: 'url(#gaugeGradientGreen)',
      glow: 'rgba(16, 185, 129, 0.4)',
      text: 'text-emerald-400',
      bg: 'from-emerald-500/10 to-emerald-500/5'
    };
    if (safeScore >= 50) return {
      stroke: 'url(#gaugeGradientYellow)',
      glow: 'rgba(245, 158, 11, 0.4)',
      text: 'text-amber-400',
      bg: 'from-amber-500/10 to-amber-500/5'
    };
    return {
      stroke: 'url(#gaugeGradientRed)',
      glow: 'rgba(239, 68, 68, 0.4)',
      text: 'text-red-400',
      bg: 'from-red-500/10 to-red-500/5'
    };
  };

  const color = getColor();

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex flex-col items-center transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      style={{ width: config.size, height: config.size }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-4 rounded-full blur-2xl opacity-50 transition-opacity duration-1000"
        style={{ backgroundColor: color.glow }}
      />

      {/* SVG */}
      <svg
        className="transform -rotate-90 relative z-10"
        width={config.size}
        height={config.size}
      >
        <defs>
          <linearGradient id="gaugeGradientGreen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="gaugeGradientYellow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="gaugeGradientRed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={config.radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-slate-800/60"
        />

        {/* Progress arc */}
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
          filter="url(#glow)"
          style={{
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />

        {/* End cap glow */}
        {animatedScore > 0 && (
          <circle
            cx={config.size / 2 + config.radius * Math.cos((percentage * 3.6 - 90) * Math.PI / 180)}
            cy={config.size / 2 + config.radius * Math.sin((percentage * 3.6 - 90) * Math.PI / 180)}
            r={config.strokeWidth / 2 + 2}
            fill={safeScore >= 70 ? '#10b981' : safeScore >= 50 ? '#f59e0b' : '#ef4444'}
            className="transition-all duration-1000"
            style={{ filter: `drop-shadow(0 0 8px ${color.glow})` }}
          />
        )}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className={cn("font-black tabular-nums tracking-tight", config.fontSize, color.text)}>
          {showPercentage ? `${Math.round(animatedScore)}` : animatedScore.toFixed(1)}
        </span>
        <span className="text-slate-500 text-xs font-medium">
          {showPercentage ? '%' : `/ ${maxScore}`}
        </span>
        <span className={cn("text-slate-400 font-semibold mt-0.5 uppercase tracking-wider", config.labelSize)}>
          {label}
        </span>
      </div>
    </div>
  );
}

// Premium Verdict Badge
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
    sm: { container: 'px-4 py-2', icon: 'w-4 h-4', text: 'text-sm' },
    md: { container: 'px-6 py-3', icon: 'w-5 h-5', text: 'text-lg' },
    lg: { container: 'px-8 py-4', icon: 'w-6 h-6', text: 'text-xl' }
  };

  const config = sizeConfig[size];

  const getVerdictConfig = () => {
    if (recommendation) {
      switch (recommendation) {
        case 'STRONG_BUY':
          return {
            label: 'STRONG BUY',
            icon: <TrendingUp className={cn(config.icon)} strokeWidth={2.5} />,
            bg: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500',
            border: 'border-emerald-400/30',
            shadow: 'shadow-[0_0_40px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]'
          };
        case 'BUY':
          return {
            label: 'BUY',
            icon: <ArrowUp className={cn(config.icon)} strokeWidth={2.5} />,
            bg: 'bg-gradient-to-r from-green-600 via-green-500 to-emerald-500',
            border: 'border-green-400/30',
            shadow: 'shadow-[0_0_30px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'
          };
        case 'HOLD':
          return {
            label: 'HOLD',
            icon: <Minus className={cn(config.icon)} strokeWidth={2.5} />,
            bg: 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500',
            border: 'border-amber-400/30',
            shadow: 'shadow-[0_0_30px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'
          };
        case 'SELL':
          return {
            label: 'SELL',
            icon: <ArrowDown className={cn(config.icon)} strokeWidth={2.5} />,
            bg: 'bg-gradient-to-r from-orange-600 via-red-500 to-red-500',
            border: 'border-red-400/30',
            shadow: 'shadow-[0_0_30px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'
          };
        case 'STRONG_SELL':
          return {
            label: 'STRONG SELL',
            icon: <TrendingDown className={cn(config.icon)} strokeWidth={2.5} />,
            bg: 'bg-gradient-to-r from-red-700 via-red-600 to-rose-500',
            border: 'border-red-400/30',
            shadow: 'shadow-[0_0_40px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]'
          };
      }
    }

    switch (verdict) {
      case 'go':
        return {
          label: 'GO',
          icon: <TrendingUp className={cn(config.icon)} strokeWidth={2.5} />,
          bg: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500',
          border: 'border-emerald-400/30',
          shadow: 'shadow-[0_0_40px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]'
        };
      case 'conditional_go':
        return {
          label: 'CONDITIONAL',
          icon: <Target className={cn(config.icon)} strokeWidth={2.5} />,
          bg: 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500',
          border: 'border-blue-400/30',
          shadow: 'shadow-[0_0_35px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]'
        };
      case 'wait':
        return {
          label: 'WAIT',
          icon: <AlertTriangle className={cn(config.icon)} strokeWidth={2.5} />,
          bg: 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500',
          border: 'border-amber-400/30',
          shadow: 'shadow-[0_0_30px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'
        };
      case 'avoid':
        return {
          label: 'AVOID',
          icon: <TrendingDown className={cn(config.icon)} strokeWidth={2.5} />,
          bg: 'bg-gradient-to-r from-red-700 via-red-600 to-rose-500',
          border: 'border-red-400/30',
          shadow: 'shadow-[0_0_40px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]'
        };
      default:
        return {
          label: 'UNKNOWN',
          icon: <Minus className={cn(config.icon)} strokeWidth={2.5} />,
          bg: 'bg-gradient-to-r from-slate-600 to-slate-500',
          border: 'border-slate-500/30',
          shadow: ''
        };
    }
  };

  const verdictConfig = getVerdictConfig();

  return (
    <div className={cn(
      "relative inline-flex items-center gap-2.5 rounded-2xl font-black text-white border overflow-hidden",
      config.container,
      verdictConfig.bg,
      verdictConfig.border,
      verdictConfig.shadow
    )}>
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />

      <span className="relative z-10">{verdictConfig.icon}</span>
      <span className={cn("relative z-10 tracking-wide", config.text)}>{verdictConfig.label}</span>
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
  const sizeConfig = {
    sm: { container: 'px-3 py-1.5', icon: 'w-3.5 h-3.5', text: 'text-xs' },
    md: { container: 'px-4 py-2', icon: 'w-4 h-4', text: 'text-sm' },
    lg: { container: 'px-5 py-2.5', icon: 'w-5 h-5', text: 'text-base' }
  };

  const config = sizeConfig[size];

  const getRiskConfig = () => {
    switch (riskLevel) {
      case 'low':
        return {
          label: 'Low Risk',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30'
        };
      case 'medium':
        return {
          label: 'Medium Risk',
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30'
        };
      case 'high':
        return {
          label: 'High Risk',
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/30'
        };
    }
  };

  const riskConfig = getRiskConfig();

  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-xl border backdrop-blur-sm",
      config.container,
      riskConfig.bg,
      riskConfig.border
    )}>
      <Shield className={cn(config.icon, riskConfig.color)} />
      <span className={cn("font-semibold", config.text, riskConfig.color)}>
        {riskConfig.label}
      </span>
    </div>
  );
}

// Main Component - Premium Trade Decision Visual
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
      <div className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 backdrop-blur-sm">
        <VerdictBadge verdict={verdict} recommendation={recommendation} size="sm" />
        {showDirectionArrow && <DirectionIndicator direction={direction || null} size="sm" />}
        <div className="text-right">
          <div className={cn(
            "text-lg font-bold tabular-nums",
            score >= 70 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"
          )}>
            {score.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-500">/ 100</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Outer glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/20 via-transparent to-orange-500/20 rounded-3xl blur-xl opacity-50" />

      {/* Main container */}
      <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
        {/* Header with subtle gradient line */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-700/30">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/30">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {symbol ? `${symbol} ` : ''}Trade Decision
              </h3>
              {isMLIS && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 bg-violet-500/20 text-violet-400 text-[10px] font-bold rounded-full border border-violet-500/30">
                  <BarChart3 className="w-3 h-3" />
                  MLIS PRO
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 items-center justify-items-center">
            {/* Verdict */}
            <div className="flex flex-col items-center gap-3">
              <VerdictBadge verdict={verdict} recommendation={recommendation} size={size} />
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Verdict</span>
            </div>

            {/* Direction */}
            {showDirectionArrow && (
              <div className="flex flex-col items-center gap-3">
                <DirectionIndicator direction={direction || null} size={size} />
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Direction</span>
              </div>
            )}

            {/* Score */}
            <div className="flex flex-col items-center gap-2">
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

            {/* Signal Strength */}
            <div className="flex flex-col items-center gap-3">
              <SignalBar verdict={verdict} recommendation={recommendation} size={size} />
            </div>
          </div>

          {/* Risk Level for MLIS */}
          {riskLevel && (
            <div className="flex justify-center mt-6 pt-5 border-t border-slate-700/30">
              <RiskIndicator riskLevel={riskLevel} size={size} />
            </div>
          )}
        </div>

        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
      </div>
    </div>
  );
}

// Export sub-components for individual use
export { SignalBar as SignalIndicator, DirectionIndicator as DirectionArrow, ScoreGauge, RiskIndicator as RiskMeter, VerdictBadge };
