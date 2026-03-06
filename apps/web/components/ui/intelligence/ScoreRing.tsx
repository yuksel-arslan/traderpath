'use client';

import { useEffect, useState } from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#00F5A0';
  if (score >= 40) return '#FFB800';
  return '#FF4757';
}

export function ScoreRing({
  score,
  size = 48,
  strokeWidth = 3,
  color,
  className,
}: ScoreRingProps) {
  // Guard against NaN/undefined/null scores
  const safeScore = typeof score === 'number' && !isNaN(score) ? Math.max(0, Math.min(100, score)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (safeScore / 100) * circumference);
    }, 300);
    return () => clearTimeout(timer);
  }, [safeScore, circumference]);

  const resolvedColor = color || getScoreColor(safeScore);

  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          className="dark:stroke-white/[0.06] stroke-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-bold text-gray-900 dark:text-white"
          style={{ fontSize: size * 0.28, fontFamily: "'JetBrains Mono', monospace" }}
        >
          {safeScore}
        </span>
      </div>
    </div>
  );
}
