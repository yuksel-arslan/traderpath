'use client';

import { PulseDot } from '@/components/ui/intelligence';
import { cn } from '@/lib/utils';

interface StepConfig {
  step: number;
  id: string;
  label: string;
  desc: string;
  icon: 'globe' | 'target' | 'report';
  color: string;
  duration: string;
}

const STEPS: StepConfig[] = [
  {
    step: 1,
    id: 'capital-flow',
    label: 'Capital Flow Scan',
    desc: 'Scans global liquidity, 5 market flows, sector activity, and AI recommendations.',
    icon: 'globe',
    color: '#00D4FF',
    duration: '~15s',
  },
  {
    step: 2,
    id: 'asset-pick',
    label: 'AI Picks Best Asset',
    desc: 'AI selects the highest-confidence asset aligned with Capital Flow direction.',
    icon: 'target',
    color: '#FFB800',
    duration: '~10s',
  },
  {
    step: 3,
    id: 'full-analysis',
    label: 'Full Analysis + Report',
    desc: '7-Step analysis with ML confirmation, trade plan, and downloadable report.',
    icon: 'report',
    color: '#00F5A0',
    duration: '~45s',
  },
];

function StepIcon({ type, color, size = 20 }: { type: string; color: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (type === 'globe')
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
  if (type === 'target')
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  if (type === 'report')
    return (
      <svg {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  return null;
}

function StepArrow() {
  return (
    <div className="hidden lg:flex items-center justify-center w-10 shrink-0">
      <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
        <path
          d="M0 8H24M24 8L18 2M24 8L18 14"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <animate
            attributeName="stroke"
            values="rgba(255,255,255,0.1);rgba(0,245,160,0.5);rgba(255,255,255,0.1)"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  );
}

interface AnalysisPipelineCardProps {
  running: boolean;
  currentStep: number; // 0-based index, -1 = not running
  onRun: () => void;
  dailyPassStatus: {
    hasPass: boolean;
    canUse: boolean;
    usageCount: number;
    maxUsage: number;
  } | null;
}

export function AnalysisPipelineCard({
  running,
  currentStep,
  onRun,
  dailyPassStatus,
}: AnalysisPipelineCardProps) {
  return (
    <div className="rounded-xl p-5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {running && <PulseDot color="#00F5A0" size={8} />}
          <span className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">
            {running ? 'Analysis Running' : 'Automated Analysis'}
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/40">
          Tailored
        </span>
      </div>

      {/* Pipeline Steps */}
      <div className="flex flex-col lg:flex-row items-stretch gap-3 lg:gap-0">
        {STEPS.map((step, i) => {
          const isActive = running && currentStep === i;
          const isDone = running && currentStep > i;
          const borderColor = isDone ? step.color : isActive ? step.color : 'rgba(255,255,255,0.08)';
          const bgColor = isActive ? `${step.color}08` : isDone ? `${step.color}05` : 'transparent';

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div
                className="rounded-xl p-4 flex-1 transition-all duration-500 relative overflow-hidden"
                style={{
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                }}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${step.color}30, transparent)`,
                      animation: 'shimmer 2s infinite',
                    }}
                  />
                )}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: `${step.color}15` }}
                    >
                      {isDone ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={step.color}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <StepIcon type={step.icon} color={step.color} size={18} />
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] font-medium" style={{ color: step.color }}>
                        STEP {step.step}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {step.label}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-500 dark:text-white/45">
                    {step.desc}
                  </p>
                  <div className="mt-2 text-[10px] text-gray-400 dark:text-white/25">
                    {step.duration}
                  </div>
                  {isActive && (
                    <div
                      className="mt-3 h-1 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: step.color,
                          width: '60%',
                          animation: 'progress 3s ease-in-out infinite',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              {i < STEPS.length - 1 && <StepArrow />}
            </div>
          );
        })}
      </div>

      {/* Run Controls */}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={onRun}
          disabled={running}
          className={cn(
            'px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
            running ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'
          )}
          style={{
            background: running
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg, #00F5A0, #00D4FF)',
            color: running ? 'rgba(255,255,255,0.4)' : '#0A0B0F',
          }}
        >
          {running ? 'Running...' : '\u25B6 Run Analysis'}
        </button>
        {dailyPassStatus && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] text-gray-400 dark:text-white/30">Daily Pass:</span>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                background: dailyPassStatus.hasPass ? 'rgba(0,245,160,0.1)' : 'rgba(255,255,255,0.06)',
                color: dailyPassStatus.hasPass ? '#00F5A0' : 'rgba(255,255,255,0.4)',
              }}
            >
              {dailyPassStatus.hasPass
                ? `Active · ${dailyPassStatus.maxUsage - dailyPassStatus.usageCount}/${dailyPassStatus.maxUsage}`
                : 'Not purchased'}
            </span>
          </div>
        )}
      </div>

      {/* CSS Keyframes */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes progress {
          0% { width: 10%; }
          50% { width: 80%; }
          100% { width: 10%; }
        }
      `}</style>
    </div>
  );
}
