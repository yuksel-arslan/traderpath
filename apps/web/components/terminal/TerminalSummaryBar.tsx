'use client';

import { ScoreRing, PulseDot } from '../ui/intelligence';

interface TerminalSummaryBarProps {
  title: string;
  subtitle: string;
  score?: number;
  status?: 'positive' | 'negative' | 'neutral';
  live?: boolean;
}

export function TerminalSummaryBar({
  title,
  subtitle,
  score,
  status = 'neutral',
  live = false,
}: TerminalSummaryBarProps) {
  const borderColor =
    status === 'positive'
      ? 'border-l-[#00F5A0]'
      : status === 'negative'
      ? 'border-l-[#FF4757]'
      : 'border-l-[#FFB800]';

  const glowBg =
    status === 'positive'
      ? 'bg-[#00F5A0]/[0.03]'
      : status === 'negative'
      ? 'bg-[#FF4757]/[0.03]'
      : 'bg-[#FFB800]/[0.03]';

  return (
    <div
      className={`rounded-xl border border-white/[0.06] dark:border-white/[0.06] border-gray-200 border-l-2 ${borderColor} ${glowBg} p-3 mb-4`}
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {score !== undefined && (
            <ScoreRing score={score} size={36} strokeWidth={3} />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {title}
              </span>
              {live && <PulseDot color="#00F5A0" size={6} />}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-white/40 truncate mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
