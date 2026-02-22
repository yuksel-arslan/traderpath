/**
 * Per-Step Scorer Implementations (TASK 2.2)
 *
 * Each scorer wraps an existing step result into a standardised StepScore.
 * They do NOT recompute the score — the calculation stays in the engine.
 * Their job: normalise the score, extract structured reasons, set confidence.
 *
 * All scorers are pure (no async, no side-effects).
 */

import type { ScoringEngine, StepScore, ScoreReason } from './scoring-engine.interface';

// ============================================================
// Minimal input shapes (only fields each scorer reads)
// ============================================================

export interface MarketPulseScorerInput {
  score: number;
  verdict: string;
  gate: { canProceed: boolean; confidence: number };
  marketRegime?: string;
  fearGreedIndex?: number;
  economicCalendar?: { shouldBlockTrade: boolean; riskLevel?: string };
}

export interface AssetScanScorerInput {
  score: number;
  gate: { canProceed: boolean; confidence: number };
  trend?: { direction: string; strength: number };
  volumeProfile?: { trend: string };
}

export interface SafetyCheckScorerInput {
  score: number;
  gate: { canProceed: boolean; confidence: number };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings?: string[];
  volatilityScore?: number;
}

export interface TimingScorerInput {
  score: number;
  gate: { canProceed: boolean; confidence: number };
  tradeNow: boolean;
  patternStrength?: number;
  conditions?: string[];
}

export interface TrapCheckScorerInput {
  score: number;
  gate: { canProceed: boolean; confidence: number };
  bullTrap?: boolean;
  bearTrap?: boolean;
  fakeout?: boolean;
  lowVolume?: boolean;
}

export interface TradePlanScorerInput {
  score: number;
  gate: { canProceed: boolean; confidence: number };
  riskReward?: number;
  winRate?: number;
}

// ============================================================
// Helpers
// ============================================================

function clamp(value: number, min = 1, max = 10): number {
  return Math.max(min, Math.min(max, value));
}

function gateConfidence(gate: { canProceed: boolean; confidence: number }): number {
  return gate.canProceed ? gate.confidence : Math.min(gate.confidence, 30);
}

// ============================================================
// Scorer: Market Pulse
// ============================================================

export class MarketPulseScorer implements ScoringEngine<MarketPulseScorerInput> {
  readonly step = 'marketPulse' as const;

  score(input: MarketPulseScorerInput): StepScore {
    const reasons: ScoreReason[] = [];

    if (input.economicCalendar?.shouldBlockTrade) {
      reasons.push({ factor: 'Economic event hard block active', positive: false, impact: 'high', source: 'Economic Calendar' });
    }

    if (input.marketRegime === 'risk_on') {
      reasons.push({ factor: 'Risk-on market regime', positive: true, impact: 'high', source: 'Market Pulse' });
    } else if (input.marketRegime === 'risk_off') {
      reasons.push({ factor: 'Risk-off market regime', positive: false, impact: 'high', source: 'Market Pulse' });
    }

    if (input.fearGreedIndex !== undefined) {
      if (input.fearGreedIndex <= 25) {
        reasons.push({ factor: `Extreme Fear (${input.fearGreedIndex}) — contrarian opportunity`, positive: true, impact: 'medium', source: 'Fear & Greed' });
      } else if (input.fearGreedIndex >= 75) {
        reasons.push({ factor: `Extreme Greed (${input.fearGreedIndex}) — overheated market`, positive: false, impact: 'medium', source: 'Fear & Greed' });
      }
    }

    if (!input.gate.canProceed) {
      reasons.push({ factor: `Gate blocked: market conditions unfavourable`, positive: false, impact: 'high', source: 'Market Pulse Gate' });
    }

    return {
      step: this.step,
      score: clamp(input.score),
      confidence: gateConfidence(input.gate),
      reasons,
    };
  }
}

// ============================================================
// Scorer: Asset Scan
// ============================================================

export class AssetScanScorer implements ScoringEngine<AssetScanScorerInput> {
  readonly step = 'assetScan' as const;

  score(input: AssetScanScorerInput): StepScore {
    const reasons: ScoreReason[] = [];

    if (input.trend) {
      const isBullish = input.trend.direction === 'bullish' || input.trend.direction === 'up';
      reasons.push({
        factor: `Trend: ${input.trend.direction} (strength ${input.trend.strength?.toFixed(0)})`,
        positive: isBullish,
        impact: input.trend.strength >= 70 ? 'high' : 'medium',
        source: 'Asset Scan',
      });
    }

    if (input.volumeProfile?.trend === 'increasing') {
      reasons.push({ factor: 'Volume confirming trend', positive: true, impact: 'medium', source: 'Volume Profile' });
    } else if (input.volumeProfile?.trend === 'decreasing') {
      reasons.push({ factor: 'Volume diverging from trend', positive: false, impact: 'medium', source: 'Volume Profile' });
    }

    if (!input.gate.canProceed) {
      reasons.push({ factor: 'Asset scan gate blocked', positive: false, impact: 'high', source: 'Asset Scan Gate' });
    }

    return {
      step: this.step,
      score: clamp(input.score),
      confidence: gateConfidence(input.gate),
      reasons,
    };
  }
}

// ============================================================
// Scorer: Safety Check
// ============================================================

export class SafetyCheckScorer implements ScoringEngine<SafetyCheckScorerInput> {
  readonly step = 'safetyCheck' as const;

  score(input: SafetyCheckScorerInput): StepScore {
    const reasons: ScoreReason[] = [];

    const riskPositive = input.riskLevel === 'low';
    const riskImpact = input.riskLevel === 'critical' ? 'high' : input.riskLevel === 'high' ? 'high' : 'medium';
    reasons.push({
      factor: `Risk level: ${input.riskLevel}`,
      positive: riskPositive,
      impact: riskImpact,
      source: 'Safety Check',
    });

    if (input.warnings && input.warnings.length > 0) {
      for (const w of input.warnings.slice(0, 3)) {
        reasons.push({ factor: w, positive: false, impact: 'medium', source: 'Safety Warning' });
      }
    }

    if (input.volatilityScore !== undefined) {
      if (input.volatilityScore > 80) {
        reasons.push({ factor: `High volatility (${input.volatilityScore.toFixed(0)}/100)`, positive: false, impact: 'high', source: 'Volatility' });
      }
    }

    return {
      step: this.step,
      score: clamp(input.score),
      confidence: gateConfidence(input.gate),
      reasons,
    };
  }
}

// ============================================================
// Scorer: Timing
// ============================================================

export class TimingScorer implements ScoringEngine<TimingScorerInput> {
  readonly step = 'timing' as const;

  score(input: TimingScorerInput): StepScore {
    const reasons: ScoreReason[] = [];

    if (input.tradeNow) {
      reasons.push({ factor: 'Multiple conditions aligned — trade now signal', positive: true, impact: 'high', source: 'Timing' });
    }

    if (input.patternStrength !== undefined && input.patternStrength > 0) {
      reasons.push({
        factor: `Candlestick pattern strength: ${input.patternStrength.toFixed(0)}`,
        positive: input.patternStrength >= 60,
        impact: input.patternStrength >= 80 ? 'high' : 'medium',
        source: 'Pattern',
      });
    }

    if (input.conditions && input.conditions.length > 0) {
      reasons.push({
        factor: `${input.conditions.length} timing condition(s) met: ${input.conditions.slice(0, 2).join(', ')}`,
        positive: true,
        impact: 'medium',
        source: 'Timing Conditions',
      });
    }

    if (!input.gate.canProceed) {
      reasons.push({ factor: 'Timing gate blocked — unfavourable entry window', positive: false, impact: 'high', source: 'Timing Gate' });
    }

    return {
      step: this.step,
      score: clamp(input.score),
      confidence: gateConfidence(input.gate),
      reasons,
    };
  }
}

// ============================================================
// Scorer: Trap Check
// ============================================================

export class TrapCheckScorer implements ScoringEngine<TrapCheckScorerInput> {
  readonly step = 'trapCheck' as const;

  score(input: TrapCheckScorerInput): StepScore {
    const reasons: ScoreReason[] = [];

    if (input.bullTrap) {
      reasons.push({ factor: 'Bull trap detected — false breakout above resistance', positive: false, impact: 'high', source: 'Trap Check' });
    }
    if (input.bearTrap) {
      reasons.push({ factor: 'Bear trap detected — false breakdown below support', positive: false, impact: 'high', source: 'Trap Check' });
    }
    if (input.fakeout) {
      reasons.push({ factor: 'Fakeout move detected', positive: false, impact: 'medium', source: 'Trap Check' });
    }
    if (input.lowVolume) {
      reasons.push({ factor: 'Low volume — move may not be sustained', positive: false, impact: 'medium', source: 'Volume' });
    }
    if (!input.bullTrap && !input.bearTrap && !input.fakeout) {
      reasons.push({ factor: 'No traps detected — price action clean', positive: true, impact: 'medium', source: 'Trap Check' });
    }

    return {
      step: this.step,
      score: clamp(input.score),
      confidence: gateConfidence(input.gate),
      reasons,
    };
  }
}

// ============================================================
// Scorer: Trade Plan
// ============================================================

export class TradePlanScorer implements ScoringEngine<TradePlanScorerInput> {
  readonly step = 'tradePlan' as const;

  score(input: TradePlanScorerInput): StepScore {
    const reasons: ScoreReason[] = [];

    if (input.riskReward !== undefined) {
      reasons.push({
        factor: `Risk/Reward ratio: ${input.riskReward.toFixed(1)}:1`,
        positive: input.riskReward >= 2,
        impact: input.riskReward >= 3 ? 'high' : input.riskReward >= 2 ? 'medium' : 'low',
        source: 'Trade Plan',
      });
    }

    if (input.winRate !== undefined) {
      reasons.push({
        factor: `Historical win rate: ${input.winRate.toFixed(0)}%`,
        positive: input.winRate >= 55,
        impact: 'medium',
        source: 'Trade Plan',
      });
    }

    if (!input.gate.canProceed) {
      reasons.push({ factor: 'Trade plan gate blocked', positive: false, impact: 'medium', source: 'Trade Plan Gate' });
    }

    return {
      step: this.step,
      score: clamp(input.score),
      confidence: gateConfidence(input.gate),
      reasons,
    };
  }
}
