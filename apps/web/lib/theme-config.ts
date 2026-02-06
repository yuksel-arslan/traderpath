// =============================================================================
// TraderPath Centralized Theme Configuration
// =============================================================================
// Single source of truth for all brand colors, chart palettes, verdict badges,
// capital-flow phases, strategy colors, RAG mode colors, and helper utilities.
// All values are Tailwind-compatible class strings unless noted otherwise.
// =============================================================================

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface ColorVariant {
  light: string;
  dark: string;
}

export interface GradientDef {
  from: string;
  via?: string;
  to: string;
  /** Ready-made Tailwind gradient class (bg-gradient-to-r ...) */
  className: string;
  /** Raw hex stops for canvas / SVG usage */
  hex: string[];
}

export interface VerdictStyle {
  text: string;
  bg: string;
  border: string;
  glow: string;
}

export interface PhaseStyle {
  text: string;
  bg: string;
  border: string;
}

export interface DirectionStyle {
  text: string;
  bg: string;
  icon: string;
}

export interface SentimentStyle {
  text: string;
  bg: string;
}

export interface BiasStyle {
  text: string;
  bg: string;
}

export type Verdict = 'go' | 'conditional_go' | 'wait' | 'avoid';
export type Phase = 'early' | 'mid' | 'late' | 'exit';
export type Direction = 'long' | 'short' | 'neutral';
export type Sentiment = 'bullish' | 'bearish' | 'neutral';
export type Bias = 'risk_on' | 'risk_off' | 'neutral';
export type Strategy = 'breakout' | 'pullback' | 'trend' | 'range';
export type RagMode = 'fast' | 'news' | 'deep';
export type ForecastHorizon = 'short' | 'medium' | 'long';

// ---------------------------------------------------------------------------
// Theme Constant
// ---------------------------------------------------------------------------

export const THEME = {
  // -------------------------------------------------------------------------
  // Brand Colors
  // -------------------------------------------------------------------------
  colors: {
    background: {
      DEFAULT: '#0F172A',
      light: 'bg-white dark:bg-slate-900',
      dark: 'bg-slate-900',
      card: 'bg-white dark:bg-slate-800/50',
      cardSolid: 'bg-white dark:bg-slate-800',
      overlay: 'bg-black/50 dark:bg-black/70',
    },

    primary: {
      DEFAULT: '#22C55E',
      hex: '#22C55E',
      text: 'text-green-500 dark:text-green-400',
      bg: 'bg-green-500',
      bgSubtle: 'bg-green-50 dark:bg-green-500/10',
      border: 'border-green-500',
      ring: 'ring-green-500/40',
      lighter: '#4ADE80',
      darker: '#16A34A',
    },

    secondary: {
      DEFAULT: '#F43F5E',
      hex: '#F43F5E',
      text: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-500',
      bgSubtle: 'bg-rose-50 dark:bg-rose-500/10',
      border: 'border-rose-500',
      ring: 'ring-rose-500/40',
      lighter: '#FB7185',
      darker: '#E11D48',
    },

    teal: {
      DEFAULT: '#14B8A6',
      hex: '#14B8A6',
      text: 'text-teal-500 dark:text-teal-400',
      bg: 'bg-teal-500',
      bgSubtle: 'bg-teal-50 dark:bg-teal-500/10',
      lighter: '#5EEDC3',
      darker: '#0D9488',
    },

    coral: {
      DEFAULT: '#F43F5E',
      hex: '#F43F5E',
      text: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-500',
      bgSubtle: 'bg-rose-50 dark:bg-rose-500/10',
      lighter: '#FF6B6B',
      darker: '#E11D48',
    },

    gradients: {
      teal: {
        from: '#5EEDC3',
        via: '#2DD4A8',
        to: '#14B8A6',
        className: 'bg-gradient-to-r from-[#5EEDC3] via-[#2DD4A8] to-[#14B8A6]',
        hex: ['#5EEDC3', '#2DD4A8', '#14B8A6'],
      } as GradientDef,

      coral: {
        from: '#FF6B6B',
        via: '#F43F5E',
        to: '#E11D48',
        className: 'bg-gradient-to-r from-[#FF6B6B] via-[#F43F5E] to-[#E11D48]',
        hex: ['#FF6B6B', '#F43F5E', '#E11D48'],
      } as GradientDef,

      brand: {
        from: '#5EEDC3',
        via: '#F43F5E',
        to: '#E11D48',
        className: 'bg-gradient-to-r from-[#5EEDC3] via-[#F43F5E] to-[#E11D48]',
        hex: ['#5EEDC3', '#F43F5E', '#E11D48'],
      } as GradientDef,

      darkCard: {
        from: '#1E293B',
        to: '#0F172A',
        className: 'bg-gradient-to-br from-slate-800 to-slate-900',
        hex: ['#1E293B', '#0F172A'],
      } as GradientDef,
    },
  },

  // -------------------------------------------------------------------------
  // Chart Palette
  // -------------------------------------------------------------------------
  charts: {
    candlestick: {
      up: '#22C55E',
      down: '#EF4444',
      upBorder: '#16A34A',
      downBorder: '#DC2626',
      wick: '#94A3B8',
    },
    line: {
      primary: '#14B8A6',
      secondary: '#8B5CF6',
      tertiary: '#F59E0B',
    },
    background: '#1A1A2E',
    backgroundAlt: '#0F172A',
    grid: 'rgba(148, 163, 184, 0.08)',
    gridLine: 'rgba(148, 163, 184, 0.12)',
    crosshair: 'rgba(148, 163, 184, 0.4)',
    tooltip: {
      bg: '#1E293B',
      border: '#334155',
      text: '#E2E8F0',
    },
    volume: {
      up: 'rgba(34, 197, 94, 0.35)',
      down: 'rgba(239, 68, 68, 0.35)',
    },
    levels: {
      entry: '#3B82F6',
      stopLoss: '#EF4444',
      tp1: '#22C55E',
      tp2: '#84CC16',
      tp3: '#06B6D4',
      current: '#F59E0B',
    },
  },

  // -------------------------------------------------------------------------
  // Verdict Styles (GO / CONDITIONAL_GO / WAIT / AVOID)
  // -------------------------------------------------------------------------
  verdicts: {
    go: {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-500 dark:border-emerald-400',
      glow: 'shadow-emerald-500/20',
    } as VerdictStyle,

    conditional_go: {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-500 dark:border-amber-400',
      glow: 'shadow-amber-500/20',
    } as VerdictStyle,

    wait: {
      text: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      border: 'border-orange-500 dark:border-orange-400',
      glow: 'shadow-orange-500/20',
    } as VerdictStyle,

    avoid: {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-500/10',
      border: 'border-red-500 dark:border-red-400',
      glow: 'shadow-red-500/20',
    } as VerdictStyle,
  },

  // -------------------------------------------------------------------------
  // Capital Flow
  // -------------------------------------------------------------------------
  capitalFlow: {
    phases: {
      early: {
        text: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        border: 'border-emerald-500 dark:border-emerald-400',
      } as PhaseStyle,

      mid: {
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-500 dark:border-blue-400',
      } as PhaseStyle,

      late: {
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-500 dark:border-amber-400',
      } as PhaseStyle,

      exit: {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-500/10',
        border: 'border-red-500 dark:border-red-400',
      } as PhaseStyle,
    },

    bias: {
      risk_on: {
        text: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      } as BiasStyle,

      risk_off: {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-500/10',
      } as BiasStyle,

      neutral: {
        text: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-50 dark:bg-slate-500/10',
      } as BiasStyle,
    },
  },

  // -------------------------------------------------------------------------
  // Strategy Type Colors
  // -------------------------------------------------------------------------
  strategies: {
    breakout: {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-500 dark:border-amber-400',
      hex: '#F59E0B',
    },
    pullback: {
      text: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-500/10',
      border: 'border-sky-500 dark:border-sky-400',
      hex: '#0EA5E9',
    },
    trend: {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-500 dark:border-emerald-400',
      hex: '#10B981',
    },
    range: {
      text: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-500/10',
      border: 'border-violet-500 dark:border-violet-400',
      hex: '#8B5CF6',
    },
  },

  // -------------------------------------------------------------------------
  // RAG (Research / Analysis / Generation) Mode Colors
  // -------------------------------------------------------------------------
  rag: {
    modes: {
      fast: {
        text: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-50 dark:bg-slate-500/10',
        border: 'border-slate-400 dark:border-slate-500',
        hex: '#94A3B8',
      },
      news: {
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-400 dark:border-blue-500',
        hex: '#3B82F6',
      },
      deep: {
        text: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-500/10',
        border: 'border-purple-400 dark:border-purple-500',
        hex: '#8B5CF6',
      },
    },

    forecastBands: {
      short: {
        fill: 'rgba(34, 197, 94, 0.15)',
        stroke: '#22C55E',
        label: 'text-emerald-500',
      },
      medium: {
        fill: 'rgba(59, 130, 246, 0.15)',
        stroke: '#3B82F6',
        label: 'text-blue-500',
      },
      long: {
        fill: 'rgba(139, 92, 246, 0.15)',
        stroke: '#8B5CF6',
        label: 'text-violet-500',
      },
    },
  },

  // -------------------------------------------------------------------------
  // Text Colors
  // -------------------------------------------------------------------------
  text: {
    primary: 'text-slate-900 dark:text-white',
    secondary: 'text-slate-700 dark:text-slate-300',
    muted: 'text-slate-500 dark:text-slate-400',
    inverse: 'text-white dark:text-slate-900',
    link: 'text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300',
  },

  // -------------------------------------------------------------------------
  // Border Colors
  // -------------------------------------------------------------------------
  border: {
    DEFAULT: 'border-slate-200 dark:border-slate-700',
    active: 'border-teal-500 dark:border-teal-400',
    focus: 'focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-500/20',
    subtle: 'border-slate-100 dark:border-slate-800',
  },
} as const;

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Returns Tailwind classes for a given verdict string.
 * Accepts common variations: 'go', 'GO', 'conditional_go', 'CONDITIONAL_GO',
 * 'cond', 'COND', 'wait', 'WAIT', 'avoid', 'AVOID'.
 */
export function getVerdictColor(verdict: string): VerdictStyle {
  const key = normalizeVerdict(verdict);
  return THEME.verdicts[key] ?? THEME.verdicts.wait;
}

/**
 * Returns Tailwind classes for a capital-flow phase.
 */
export function getPhaseColor(phase: string): PhaseStyle {
  const key = normalizePhase(phase);
  return THEME.capitalFlow.phases[key] ?? THEME.capitalFlow.phases.mid;
}

/**
 * Returns Tailwind classes and icon identifier for a trade direction.
 */
export function getDirectionColor(direction: string): DirectionStyle {
  const key = normalizeDirection(direction);

  const map: Record<Direction, DirectionStyle> = {
    long: {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      icon: 'TrendingUp',
    },
    short: {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-500/10',
      icon: 'TrendingDown',
    },
    neutral: {
      text: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-50 dark:bg-slate-500/10',
      icon: 'Minus',
    },
  };

  return map[key] ?? map.neutral;
}

/**
 * Returns Tailwind classes for a sentiment value.
 */
export function getSentimentColor(sentiment: string): SentimentStyle {
  const key = sentiment.toLowerCase().trim() as Sentiment;

  const map: Record<Sentiment, SentimentStyle> = {
    bullish: {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    bearish: {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-500/10',
    },
    neutral: {
      text: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-50 dark:bg-slate-500/10',
    },
  };

  return map[key] ?? map.neutral;
}

/**
 * Returns Tailwind classes for a liquidity bias value.
 */
export function getBiasColor(bias: string): BiasStyle {
  const key = normalizeBias(bias);
  return THEME.capitalFlow.bias[key] ?? THEME.capitalFlow.bias.neutral;
}

// ---------------------------------------------------------------------------
// Normalisation Helpers (internal)
// ---------------------------------------------------------------------------

function normalizeVerdict(raw: string): Verdict {
  const v = raw.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (v === 'go') return 'go';
  if (v === 'conditional_go' || v === 'cond' || v === 'conditional') return 'conditional_go';
  if (v === 'wait' || v === 'hold') return 'wait';
  if (v === 'avoid' || v === 'stop') return 'avoid';
  return 'wait';
}

function normalizePhase(raw: string): Phase {
  const p = raw.toLowerCase().trim();
  if (p === 'early') return 'early';
  if (p === 'mid') return 'mid';
  if (p === 'late') return 'late';
  if (p === 'exit') return 'exit';
  return 'mid';
}

function normalizeDirection(raw: string): Direction {
  const d = raw.toLowerCase().trim();
  if (d === 'long' || d === 'buy' || d === 'bullish') return 'long';
  if (d === 'short' || d === 'sell' || d === 'bearish') return 'short';
  return 'neutral';
}

function normalizeBias(raw: string): Bias {
  const b = raw.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (b === 'risk_on' || b === 'riskon') return 'risk_on';
  if (b === 'risk_off' || b === 'riskoff') return 'risk_off';
  return 'neutral';
}
