'use client';

// ===========================================
// Onboarding Tour Component - 2026 Edition
// Modern, minimal, glass-morphism design
// ===========================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  target: string; // CSS selector for the target element
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  spotlightPadding?: number;
}

interface OnboardingTourProps {
  steps: TourStep[];
  tourId: string;
  onComplete?: () => void;
  onSkip?: () => void;
  autoStart?: boolean;
}

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipPosition {
  top: number;
  left: number;
  placement: Placement;
  arrowPosition: { top: number; left: number; rotation: number };
}

export function OnboardingTour({
  steps,
  tourId,
  onComplete,
  onSkip,
  autoStart = true,
}: OnboardingTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const storageKey = `tour_completed_${tourId}`;

  // Check if tour was already completed
  useEffect(() => {
    if (autoStart) {
      const completed = localStorage.getItem(storageKey);
      if (!completed) {
        const timer = setTimeout(() => {
          setIsActive(true);
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 300);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [autoStart, storageKey]);

  // Calculate best placement based on available space
  const calculateBestPlacement = useCallback((
    rect: DOMRect,
    tooltipWidth: number,
    tooltipHeight: number,
    preferredPlacement?: string
  ): Placement => {
    const padding = 24;
    const arrowHeight = 12;

    const spaceTop = rect.top - padding - arrowHeight;
    const spaceBottom = window.innerHeight - rect.bottom - padding - arrowHeight;
    const spaceLeft = rect.left - padding - arrowHeight;
    const spaceRight = window.innerWidth - rect.right - padding - arrowHeight;

    // If preferred placement has enough space, use it
    if (preferredPlacement && preferredPlacement !== 'auto') {
      const hasSpace = {
        top: spaceTop >= tooltipHeight,
        bottom: spaceBottom >= tooltipHeight,
        left: spaceLeft >= tooltipWidth,
        right: spaceRight >= tooltipWidth,
      };
      if (hasSpace[preferredPlacement as Placement]) {
        return preferredPlacement as Placement;
      }
    }

    // Find best placement with most space
    const spaces = [
      { placement: 'bottom' as Placement, space: spaceBottom, needed: tooltipHeight },
      { placement: 'top' as Placement, space: spaceTop, needed: tooltipHeight },
      { placement: 'right' as Placement, space: spaceRight, needed: tooltipWidth },
      { placement: 'left' as Placement, space: spaceLeft, needed: tooltipWidth },
    ];

    // Sort by available space ratio
    spaces.sort((a, b) => (b.space / b.needed) - (a.space / a.needed));

    return spaces[0].placement;
  }, []);

  // Update target element position
  const updateTargetPosition = useCallback(() => {
    if (!isActive || !steps[currentStep]) return;

    const target = document.querySelector(steps[currentStep].target);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    setTargetRect(rect);

    // Tooltip dimensions
    const tooltipWidth = 340;
    const tooltipHeight = 160;
    const gap = 16;
    const arrowSize = 10;

    const placement = calculateBestPlacement(
      rect,
      tooltipWidth,
      tooltipHeight,
      steps[currentStep].placement
    );

    let top = 0;
    let left = 0;
    let arrowTop = 0;
    let arrowLeft = 0;
    let arrowRotation = 0;

    switch (placement) {
      case 'top':
        top = rect.top - tooltipHeight - gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowTop = tooltipHeight - 2;
        arrowLeft = tooltipWidth / 2 - arrowSize;
        arrowRotation = 180;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowTop = -arrowSize * 2 + 2;
        arrowLeft = tooltipWidth / 2 - arrowSize;
        arrowRotation = 0;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - gap;
        arrowTop = tooltipHeight / 2 - arrowSize;
        arrowLeft = tooltipWidth - 2;
        arrowRotation = 90;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
        arrowTop = tooltipHeight / 2 - arrowSize;
        arrowLeft = -arrowSize * 2 + 2;
        arrowRotation = -90;
        break;
    }

    // Keep tooltip within viewport with padding
    const viewportPadding = 16;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipWidth - viewportPadding));
    top = Math.max(viewportPadding, Math.min(top, window.innerHeight - tooltipHeight - viewportPadding));

    setPosition({
      top,
      left,
      placement,
      arrowPosition: { top: arrowTop, left: arrowLeft, rotation: arrowRotation },
    });

    // Smooth scroll target into view
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [isActive, currentStep, steps, calculateBestPlacement]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition, true);
    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition, true);
    };
  }, [updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === 'Escape') handleSkip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep]);

  const handleNext = () => {
    setIsAnimating(true);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setCurrentStep(currentStep - 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    setIsActive(false);
    setCurrentStep(0);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'true');
    setIsActive(false);
    setCurrentStep(0);
    onSkip?.();
  };

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  }, []);

  useEffect(() => {
    (window as unknown as Record<string, unknown>)[`startTour_${tourId}`] = startTour;
    return () => {
      delete (window as unknown as Record<string, unknown>)[`startTour_${tourId}`];
    };
  }, [tourId, startTour]);

  if (!isActive || !steps[currentStep] || !position) return null;

  const step = steps[currentStep];
  const spotlightPadding = step.spotlightPadding ?? 12;

  return (
    <>
      {/* Backdrop with spotlight */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id={`spotlight-${tourId}`}>
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - spotlightPadding}
                  y={targetRect.top - spotlightPadding}
                  width={targetRect.width + spotlightPadding * 2}
                  height={targetRect.height + spotlightPadding * 2}
                  rx="12"
                  ry="12"
                  fill="black"
                />
              )}
            </mask>
            <filter id="blur-filter">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.6)"
            mask={`url(#spotlight-${tourId})`}
            className="transition-all duration-300"
          />
        </svg>

        {/* Spotlight ring - subtle glow */}
        {targetRect && (
          <div
            className="absolute rounded-xl pointer-events-none transition-all duration-300 ease-out"
            style={{
              left: targetRect.left - spotlightPadding - 2,
              top: targetRect.top - spotlightPadding - 2,
              width: targetRect.width + spotlightPadding * 2 + 4,
              height: targetRect.height + spotlightPadding * 2 + 4,
              boxShadow: `
                0 0 0 2px rgba(45, 212, 191, 0.6),
                0 0 24px rgba(45, 212, 191, 0.3),
                inset 0 0 0 1px rgba(255, 255, 255, 0.1)
              `,
            }}
          />
        )}
      </div>

      {/* Click blocker */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={handleSkip}
        style={{ cursor: 'default' }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          "fixed z-[9999] w-[340px] pointer-events-auto",
          "transition-all duration-300 ease-out",
          isAnimating && "opacity-0 scale-95",
          !isAnimating && "opacity-100 scale-100"
        )}
        style={{
          top: position.top,
          left: position.left,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glass card */}
        <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          {/* Subtle gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400" />

          {/* Arrow pointer */}
          <div
            className="absolute w-5 h-5 rotate-45 bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-700/50"
            style={{
              top: position.arrowPosition.top,
              left: position.arrowPosition.left,
              transform: `rotate(${position.arrowPosition.rotation + 45}deg)`,
              borderWidth: position.placement === 'bottom' ? '1px 0 0 1px' :
                          position.placement === 'top' ? '0 1px 1px 0' :
                          position.placement === 'left' ? '1px 1px 0 0' : '0 0 1px 1px',
            }}
          />

          {/* Content */}
          <div className="relative p-5">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                  <Lightbulb className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentStep + 1} of {steps.length}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              {step.content}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              {/* Progress bar */}
              <div className="flex-1 max-w-24">
                <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Previous step"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className={cn(
                    "h-9 px-4 rounded-lg flex items-center gap-2 font-medium text-sm transition-all",
                    currentStep === steps.length - 1
                      ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
                      : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100"
                  )}
                >
                  {currentStep === steps.length - 1 ? 'Done' : 'Next'}
                  {currentStep < steps.length - 1 && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper component - Tour trigger button
export function TourTriggerButton({
  tourId,
  className,
  variant = 'default',
}: {
  tourId: string;
  className?: string;
  variant?: 'default' | 'minimal' | 'icon';
}) {
  const handleClick = () => {
    const startTour = (window as unknown as Record<string, unknown>)[`startTour_${tourId}`];
    if (startTour) {
      localStorage.removeItem(`tour_completed_${tourId}`);
      startTour();
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-teal-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
          className
        )}
        title="Start guided tour"
        aria-label="Start guided tour"
      >
        <Lightbulb className="w-4 h-4" />
      </button>
    );
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "text-sm text-slate-500 hover:text-teal-500 transition-colors",
          className
        )}
      >
        Take a tour
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800",
        className
      )}
      title="Start guided tour"
    >
      <Lightbulb className="w-4 h-4" />
      <span>Guide</span>
    </button>
  );
}
