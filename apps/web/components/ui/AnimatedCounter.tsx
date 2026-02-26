'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface AnimatedCounterProps {
  /** Target value to count to */
  end: number;
  /** Text appended after the number (e.g. "%", "+") */
  suffix?: string;
  /** Text prepended before the number (e.g. "+", "$") */
  prefix?: string;
  /** Animation duration in milliseconds */
  duration?: number;
  /** Number of decimal places (auto-detected from `end` if omitted) */
  decimals?: number;
  /** IntersectionObserver threshold (0-1) */
  threshold?: number;
  /** Additional className for the wrapper span */
  className?: string;
}

/** Ease-out cubic for natural deceleration */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * AnimatedCounter — counts from 0 to `end` when scrolled into view.
 *
 * Uses requestAnimationFrame for smooth 60fps animation and
 * IntersectionObserver to trigger only when visible.
 */
export function AnimatedCounter({
  end,
  suffix = '',
  prefix = '',
  duration = 2000,
  decimals,
  threshold = 0.3,
  className = '',
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLSpanElement>(null);
  const hasStarted = useRef(false);

  // Auto-detect decimal places from the end value
  const decimalPlaces = decimals ?? (end % 1 !== 0 ? 1 : 0);

  const formatValue = useCallback(
    (val: number) => {
      if (decimalPlaces > 0) {
        return val.toFixed(decimalPlaces);
      }
      return Math.floor(val).toLocaleString();
    },
    [decimalPlaces],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasStarted.current) return;
        hasStarted.current = true;

        const startTime = performance.now();

        function tick(now: number) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easedProgress = easeOutCubic(progress);
          const currentValue = easedProgress * end;

          setDisplay(formatValue(currentValue));

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            setDisplay(formatValue(end));
          }
        }

        requestAnimationFrame(tick);
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration, threshold, formatValue]);

  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
