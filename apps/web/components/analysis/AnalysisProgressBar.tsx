'use client';

// ===========================================
// Sophisticated 7-Step Analysis Progress Bar
// Premium design with animations
// ===========================================

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  Shield,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Check,
  Lock,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface Step {
  id: number;
  name: string;
  shortName: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
}

// Step order: Trap Check (5) before Trade Plan (6) - decision before plan
const STEPS: Step[] = [
  { id: 1, name: 'Market Pulse', shortName: 'Market', icon: TrendingUp, color: 'blue', gradient: 'from-blue-500 to-blue-600' },
  { id: 2, name: 'Asset Scanner', shortName: 'Scanner', icon: BarChart3, color: 'cyan', gradient: 'from-cyan-500 to-cyan-600' },
  { id: 3, name: 'Safety Check', shortName: 'Safety', icon: Shield, color: 'amber', gradient: 'from-amber-500 to-amber-600' },
  { id: 4, name: 'Timing', shortName: 'Timing', icon: Clock, color: 'purple', gradient: 'from-purple-500 to-purple-600' },
  { id: 5, name: 'Trap Check', shortName: 'Trap', icon: AlertTriangle, color: 'orange', gradient: 'from-orange-500 to-orange-600' },
  { id: 6, name: 'Trade Plan', shortName: 'Plan', icon: Target, color: 'indigo', gradient: 'from-indigo-500 to-indigo-600' },
  { id: 7, name: 'Final Verdict', shortName: 'Verdict', icon: CheckCircle, color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
];

interface AnalysisProgressBarProps {
  completedSteps?: number[];
  activeStep?: number;
  isRunning?: boolean;
  onStepClick?: (stepId: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  animated?: boolean;
}

export function AnalysisProgressBar({
  completedSteps = [],
  activeStep = 0,
  isRunning = false,
  onStepClick,
  size = 'md',
  showLabels = true,
  animated = true,
}: AnalysisProgressBarProps) {
  const [animatedStep, setAnimatedStep] = useState(0);

  // Animate through steps when running
  useEffect(() => {
    if (isRunning && animated) {
      const interval = setInterval(() => {
        setAnimatedStep((prev) => (prev >= 7 ? 1 : prev + 1));
      }, 800);
      return () => clearInterval(interval);
    } else {
      setAnimatedStep(activeStep);
    }
  }, [isRunning, activeStep, animated]);

  const sizeClasses = {
    sm: { circle: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-[9px]', gap: 'gap-1' },
    md: { circle: 'w-11 h-11', icon: 'w-5 h-5', text: 'text-[10px]', gap: 'gap-2' },
    lg: { circle: 'w-14 h-14', icon: 'w-6 h-6', text: 'text-xs', gap: 'gap-3' },
  };

  const sizes = sizeClasses[size];

  const getStepState = (stepId: number) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (stepId === activeStep || stepId === animatedStep) return 'active';
    if (stepId === 1 || completedSteps.includes(stepId - 1)) return 'unlocked';
    return 'locked';
  };

  const progressPercentage = completedSteps.length > 0
    ? ((completedSteps.length) / 7) * 100
    : 0;

  return (
    <div className="w-full">
      {/* Progress Container */}
      <div className="relative">
        {/* Background Track */}
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 mx-6 sm:mx-8">
          <div className="w-full h-full bg-gray-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
            {/* Animated Progress Fill */}
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-500 rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${progressPercentage}%` }}
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="relative flex items-center justify-between">
          {STEPS.map((step, index) => {
            const state = getStepState(step.id);
            const Icon = step.icon;
            const isClickable = state === 'completed' && onStepClick;

            return (
              <div key={step.id} className={cn("flex flex-col items-center", sizes.gap)}>
                {/* Step Circle */}
                <button
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "relative rounded-full flex items-center justify-center transition-all duration-300 z-10",
                    sizes.circle,
                    // Completed state
                    state === 'completed' && cn(
                      "bg-gradient-to-br",
                      step.gradient,
                      "text-white shadow-lg",
                      isClickable && "cursor-pointer hover:scale-110 hover:shadow-xl"
                    ),
                    // Active state
                    state === 'active' && cn(
                      "bg-white dark:bg-slate-800 border-2",
                      `border-${step.color}-500`,
                      `text-${step.color}-500`,
                      "shadow-lg",
                      isRunning && "animate-pulse"
                    ),
                    // Unlocked state
                    state === 'unlocked' && cn(
                      "bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600",
                      "text-gray-400 dark:text-slate-500"
                    ),
                    // Locked state
                    state === 'locked' && cn(
                      "bg-gray-100 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700",
                      "text-gray-300 dark:text-slate-600"
                    )
                  )}
                  style={state === 'active' ? {
                    boxShadow: `0 0 20px rgba(var(--${step.color}-500-rgb, 59, 130, 246), 0.4)`,
                  } : undefined}
                >
                  {/* Glow Ring for Active */}
                  {state === 'active' && (
                    <div className={cn(
                      "absolute inset-0 rounded-full animate-ping opacity-30",
                      `bg-${step.color}-500`
                    )} />
                  )}

                  {/* Checkmark for Completed */}
                  {state === 'completed' ? (
                    <div className="relative">
                      <Check className={cn(sizes.icon, "stroke-[3]")} />
                      {/* Success particle effect */}
                      <div className="absolute -inset-1 bg-white/20 rounded-full animate-ping opacity-0" />
                    </div>
                  ) : state === 'locked' ? (
                    <Lock className={cn(sizes.icon, "opacity-50")} />
                  ) : (
                    <Icon className={sizes.icon} />
                  )}

                  {/* Step Number Badge */}
                  <div className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold",
                    state === 'completed' ? "bg-white text-emerald-600" :
                    state === 'active' ? `bg-${step.color}-500 text-white` :
                    "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                  )}>
                    {step.id}
                  </div>
                </button>

                {/* Step Label */}
                {showLabels && (
                  <div className={cn(
                    "text-center transition-colors duration-300",
                    sizes.text,
                    state === 'completed' && "text-gray-900 dark:text-white font-medium",
                    state === 'active' && `text-${step.color}-600 dark:text-${step.color}-400 font-semibold`,
                    state === 'unlocked' && "text-gray-500 dark:text-slate-400",
                    state === 'locked' && "text-gray-400 dark:text-slate-600"
                  )}>
                    <span className="hidden sm:inline">{step.name}</span>
                    <span className="sm:hidden">{step.shortName}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500" />
          <span className="text-gray-500 dark:text-slate-400">
            {completedSteps.length}/7 Complete
          </span>
        </div>
        {progressPercentage > 0 && progressPercentage < 100 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-blue-500 dark:text-blue-400 font-medium">
              {Math.round(progressPercentage)}% Progress
            </span>
          </div>
        )}
        {progressPercentage === 100 && (
          <div className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Analysis Complete!</span>
          </div>
        )}
      </div>

      {/* Add shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

// Compact version for inline use
export function AnalysisProgressBarCompact({
  completedSteps = [],
  activeStep = 0,
}: {
  completedSteps?: number[];
  activeStep?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step) => {
        const isCompleted = completedSteps.includes(step.id);
        const isActive = step.id === activeStep;

        return (
          <div
            key={step.id}
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
              isCompleted && "bg-emerald-500 text-white",
              isActive && !isCompleted && "bg-blue-500 text-white animate-pulse",
              !isCompleted && !isActive && "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
            )}
          >
            {isCompleted ? <Check className="w-3 h-3" /> : step.id}
          </div>
        );
      })}
    </div>
  );
}
