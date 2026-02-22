/**
 * Unit tests — Scoring Engine (TASK 3.2)
 *
 * Covers:
 *   • STEP_WEIGHTS: rows sum to 1.0 for each bundle type
 *   • VERDICT_THRESHOLDS: correct ordering
 *   • quickStepScore(): clamps score, preserves step
 *   • aggregateScores(): bundle-aware weighted average
 *   • aggregateScores(): trade plan weight redistribution
 *   • aggregateScores(): economic block → 'avoid' verdict
 *   • aggregateScores(): critical safety → 'avoid' verdict
 *   • Verdict thresholds: go / conditional_go / wait / avoid
 */

import { describe, it, expect } from 'vitest';
import {
  aggregateScores,
  quickStepScore,
  STEP_WEIGHTS,
  TRADE_PLAN_WEIGHT,
  VERDICT_THRESHOLDS,
} from '../scoring';
import type { StepScore, AggregateInput } from '../scoring';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStepScore(
  step: StepScore['step'],
  score: number,
  extras?: Partial<StepScore>,
): StepScore {
  return {
    step,
    score,
    confidence: 70,
    reasons: [],
    ...extras,
  };
}

/** Build a "healthy" AggregateInput for 5 steps (no trade plan) */
function makeHealthyInput(
  bundleType: AggregateInput['bundleType'],
  score = 8,
): AggregateInput {
  return {
    bundleType,
    hasTradePlan: false,
    scores: [
      makeStepScore('marketPulse', score),
      makeStepScore('assetScan',   score),
      makeStepScore('safetyCheck', score),
      makeStepScore('timing',      score),
      makeStepScore('trapCheck',   score),
    ],
  };
}

// ---------------------------------------------------------------------------
// STEP_WEIGHTS invariants
// ---------------------------------------------------------------------------

describe('STEP_WEIGHTS', () => {
  const bundleTypes = ['scalping', 'day', 'swing'] as const;

  for (const bundleType of bundleTypes) {
    it(`${bundleType}: all 5 step weights (excl. tradePlan) sum to 1.0`, () => {
      const weights = STEP_WEIGHTS[bundleType];
      const sum = (['marketPulse', 'assetScan', 'safetyCheck', 'timing', 'trapCheck'] as const)
        .reduce((acc, step) => acc + weights[step], 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it(`${bundleType}: tradePlan weight is 0 (handled separately)`, () => {
      expect(STEP_WEIGHTS[bundleType].tradePlan).toBe(0);
    });
  }

  it('scalping weights Timing higher than swing Timing', () => {
    expect(STEP_WEIGHTS.scalping.timing).toBeGreaterThan(STEP_WEIGHTS.swing.timing);
  });

  it('swing weights MarketPulse higher than scalping MarketPulse', () => {
    expect(STEP_WEIGHTS.swing.marketPulse).toBeGreaterThan(STEP_WEIGHTS.scalping.marketPulse);
  });

  it('swing weights AssetScan higher than scalping AssetScan', () => {
    expect(STEP_WEIGHTS.swing.assetScan).toBeGreaterThan(STEP_WEIGHTS.scalping.assetScan);
  });

  it('scalping weights TrapCheck higher than swing TrapCheck', () => {
    expect(STEP_WEIGHTS.scalping.trapCheck).toBeGreaterThan(STEP_WEIGHTS.swing.trapCheck);
  });
});

// ---------------------------------------------------------------------------
// VERDICT_THRESHOLDS ordering
// ---------------------------------------------------------------------------

describe('VERDICT_THRESHOLDS', () => {
  it('GO > CONDITIONAL_GO > WAIT', () => {
    expect(VERDICT_THRESHOLDS.GO).toBeGreaterThan(VERDICT_THRESHOLDS.CONDITIONAL_GO);
    expect(VERDICT_THRESHOLDS.CONDITIONAL_GO).toBeGreaterThan(VERDICT_THRESHOLDS.WAIT);
    expect(VERDICT_THRESHOLDS.WAIT).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// quickStepScore
// ---------------------------------------------------------------------------

describe('quickStepScore()', () => {
  it('preserves step name', () => {
    const s = quickStepScore('timing', { score: 7 });
    expect(s.step).toBe('timing');
  });

  it('clamps score above 10 to 10', () => {
    const s = quickStepScore('trapCheck', { score: 15 });
    expect(s.score).toBe(10);
  });

  it('clamps score below 1 to 1', () => {
    const s = quickStepScore('safetyCheck', { score: 0 });
    expect(s.score).toBe(1);
  });

  it('uses gate confidence when provided', () => {
    const s = quickStepScore('assetScan', {
      score: 7,
      gate: { canProceed: true, confidence: 85 },
    });
    expect(s.confidence).toBe(85);
  });

  it('defaults confidence to 50 when no gate', () => {
    const s = quickStepScore('marketPulse', { score: 7 });
    expect(s.confidence).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// aggregateScores — basic weighted average
// ---------------------------------------------------------------------------

describe('aggregateScores() — weighted average', () => {
  it('uniform score 8 produces overallScore ≈ 8 for day bundle', () => {
    const result = aggregateScores(makeHealthyInput('day', 8));
    expect(result.overallScore).toBeCloseTo(8, 1);
  });

  it('uniform score 8 produces overallScore ≈ 8 for scalping bundle', () => {
    const result = aggregateScores(makeHealthyInput('scalping', 8));
    expect(result.overallScore).toBeCloseTo(8, 1);
  });

  it('uniform score 8 produces overallScore ≈ 8 for swing bundle', () => {
    const result = aggregateScores(makeHealthyInput('swing', 8));
    expect(result.overallScore).toBeCloseTo(8, 1);
  });

  it('includes all 5 components in componentScores', () => {
    const result = aggregateScores(makeHealthyInput('day', 7));
    expect(result.componentScores).toHaveLength(5);
  });

  it('bundleType is preserved in result', () => {
    const result = aggregateScores(makeHealthyInput('swing', 8));
    expect(result.bundleType).toBe('swing');
  });

  it('overallScore is clamped / within 0-10', () => {
    for (const score of [1, 5, 10]) {
      const result = aggregateScores(makeHealthyInput('day', score));
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(10);
    }
  });
});

// ---------------------------------------------------------------------------
// aggregateScores — trade plan weight
// ---------------------------------------------------------------------------

describe('aggregateScores() — with trade plan', () => {
  it('includes tradePlan component when hasTradePlan = true', () => {
    const input: AggregateInput = {
      bundleType: 'day',
      hasTradePlan: true,
      scores: [
        makeStepScore('marketPulse', 8),
        makeStepScore('assetScan',   8),
        makeStepScore('safetyCheck', 8),
        makeStepScore('timing',      8),
        makeStepScore('trapCheck',   8),
        makeStepScore('tradePlan',   9),
      ],
    };
    const result = aggregateScores(input);
    const hasTradePlanComponent = result.componentScores.some(cs => cs.step === 'tradePlan');
    expect(hasTradePlanComponent).toBe(true);
  });

  it('tradePlan weight is TRADE_PLAN_WEIGHT (0.15)', () => {
    const input: AggregateInput = {
      bundleType: 'day',
      hasTradePlan: true,
      scores: [
        makeStepScore('marketPulse', 8),
        makeStepScore('assetScan',   8),
        makeStepScore('safetyCheck', 8),
        makeStepScore('timing',      8),
        makeStepScore('trapCheck',   8),
        makeStepScore('tradePlan',   9),
      ],
    };
    const result = aggregateScores(input);
    const tpComponent = result.componentScores.find(cs => cs.step === 'tradePlan');
    expect(tpComponent?.weight).toBeCloseTo(TRADE_PLAN_WEIGHT, 3);
  });

  it('total weight still sums to 1.0 when trade plan included', () => {
    const input: AggregateInput = {
      bundleType: 'day',
      hasTradePlan: true,
      scores: [
        makeStepScore('marketPulse', 8),
        makeStepScore('assetScan',   8),
        makeStepScore('safetyCheck', 8),
        makeStepScore('timing',      8),
        makeStepScore('trapCheck',   8),
        makeStepScore('tradePlan',   9),
      ],
    };
    const result = aggregateScores(input);
    const totalWeight = result.componentScores.reduce((sum, cs) => sum + cs.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 3);
  });
});

// ---------------------------------------------------------------------------
// aggregateScores — verdict resolution
// ---------------------------------------------------------------------------

describe('aggregateScores() — verdict', () => {
  it('score >= GO threshold → verdict go', () => {
    const result = aggregateScores(makeHealthyInput('day', VERDICT_THRESHOLDS.GO + 0.5));
    expect(result.verdict).toBe('go');
  });

  it('score between CONDITIONAL_GO and GO → verdict conditional_go', () => {
    const midScore = (VERDICT_THRESHOLDS.CONDITIONAL_GO + VERDICT_THRESHOLDS.GO) / 2;
    const result = aggregateScores(makeHealthyInput('day', midScore));
    expect(result.verdict).toBe('conditional_go');
  });

  it('score between WAIT and CONDITIONAL_GO → verdict wait', () => {
    const midScore = (VERDICT_THRESHOLDS.WAIT + VERDICT_THRESHOLDS.CONDITIONAL_GO) / 2;
    const result = aggregateScores(makeHealthyInput('day', midScore));
    expect(result.verdict).toBe('wait');
  });

  it('score below WAIT → verdict avoid', () => {
    const result = aggregateScores(makeHealthyInput('day', 1));
    expect(result.verdict).toBe('avoid');
  });

  it('economic block reason on marketPulse → verdict avoid regardless of score', () => {
    const input: AggregateInput = {
      bundleType: 'day',
      hasTradePlan: false,
      scores: [
        makeStepScore('marketPulse', 9, {
          reasons: [{
            factor: 'FOMC day - economic hard block',
            positive: false,
            impact: 'high',
            source: 'Economic Calendar',
          }],
        }),
        makeStepScore('assetScan',   9),
        makeStepScore('safetyCheck', 9),
        makeStepScore('timing',      9),
        makeStepScore('trapCheck',   9),
      ],
    };
    const result = aggregateScores(input);
    expect(result.verdict).toBe('avoid');
  });

  it('critical safety (score <= 2) → verdict avoid', () => {
    const input: AggregateInput = {
      bundleType: 'day',
      hasTradePlan: false,
      scores: [
        makeStepScore('marketPulse', 9),
        makeStepScore('assetScan',   9),
        makeStepScore('safetyCheck', 1), // critical safety — score 1
        makeStepScore('timing',      9),
        makeStepScore('trapCheck',   9),
      ],
    };
    const result = aggregateScores(input);
    // Safety score 1 → treated as critical; overall may still be high but verdict forced
    expect(result.verdict).toBe('avoid');
  });
});

// ---------------------------------------------------------------------------
// Bundle-specific weight differences produce different scores
// ---------------------------------------------------------------------------

describe('aggregateScores() — bundle weight differences', () => {
  it('low timing score hurts scalping more than swing', () => {
    const badTiming = (bundle: AggregateInput['bundleType']) =>
      aggregateScores({
        bundleType: bundle,
        hasTradePlan: false,
        scores: [
          makeStepScore('marketPulse', 8),
          makeStepScore('assetScan',   8),
          makeStepScore('safetyCheck', 8),
          makeStepScore('timing',      2), // bad timing
          makeStepScore('trapCheck',   8),
        ],
      }).overallScore;

    expect(badTiming('scalping')).toBeLessThan(badTiming('swing'));
  });

  it('low marketPulse score hurts swing more than scalping', () => {
    const badPulse = (bundle: AggregateInput['bundleType']) =>
      aggregateScores({
        bundleType: bundle,
        hasTradePlan: false,
        scores: [
          makeStepScore('marketPulse', 2), // bad macro
          makeStepScore('assetScan',   8),
          makeStepScore('safetyCheck', 8),
          makeStepScore('timing',      8),
          makeStepScore('trapCheck',   8),
        ],
      }).overallScore;

    expect(badPulse('swing')).toBeLessThan(badPulse('scalping'));
  });
});
