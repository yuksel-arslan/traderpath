'use client';

type VerdictType = 'GO' | 'COND' | 'WAIT' | 'AVOID';

interface VerdictBadgeProps {
  verdict: VerdictType | string;
  className?: string;
}

const verdictConfig: Record<VerdictType, { color: string; bg: string; label: string }> = {
  GO: { color: '#00F5A0', bg: 'rgba(0,245,160,0.12)', label: 'GO' },
  COND: { color: '#FFB800', bg: 'rgba(255,184,0,0.12)', label: 'CONDITIONAL' },
  WAIT: { color: '#00D4FF', bg: 'rgba(0,212,255,0.12)', label: 'WAIT' },
  AVOID: { color: '#FF4757', bg: 'rgba(255,71,87,0.12)', label: 'AVOID' },
};

function normalizeVerdict(verdict: string): VerdictType {
  if (!verdict || typeof verdict !== 'string') return 'WAIT';
  const v = verdict.toUpperCase().replace(/[^A-Z_]/g, '');
  if (v === 'GO') return 'GO';
  if (v === 'CONDITIONAL_GO' || v === 'CONDITIONALGO' || v === 'COND' || v === 'CGO' || v === 'C_GO') return 'COND';
  if (v === 'WAIT') return 'WAIT';
  if (v === 'AVOID' || v === 'NO_GO' || v === 'NOGO') return 'AVOID';
  return 'WAIT';
}

export function VerdictBadge({ verdict, className }: VerdictBadgeProps) {
  const normalized = normalizeVerdict(verdict);
  const config = verdictConfig[normalized];

  return (
    <span
      className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-semibold ${className || ''}`}
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}
