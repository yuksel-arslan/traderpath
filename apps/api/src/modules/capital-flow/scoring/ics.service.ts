/**
 * L4 — Instrument Conviction Score (ICS)
 *
 * Combines 7-Step Engine + MLIS Pro outputs into a single conviction score.
 *
 * Formula:
 *   ICS = α · Score_7Step + β · Prob_ML + γ · RS_asset
 *
 * Calibration:
 *   Uses the same Platt scaling (sigmoid calibration) from
 *   platt-scaling.service.ts — trained on real Analysis.outcome
 *   data (TP_HIT vs SL_HIT) via gradient descent.
 *   When <30 historical outcomes exist, uses default sigmoid params.
 *
 * Trade Trigger:
 *   Buy  if ICS > 0.7 AND GLRS > 55
 *   Sell if ICS < 0.3 AND GLRS < 45
 *   Hold otherwise
 */

import type { ICSResult, ConvictionSignal } from './regime-score.types';
import { clamp } from './statistics';
import {
  calibrateScore,
  type TrainingOutcome,
} from '../../analysis/services/ml/platt-scaling.service';

// ============================================================
// Default weights (must sum to 1.0)
// ============================================================

const DEFAULT_ICS_WEIGHTS = {
  alpha: 0.45,  // 7-Step analysis (primary)
  beta: 0.35,   // ML probability (MLIS)
  gamma: 0.20,  // Asset relative strength
} as const;

// ============================================================
// GLRS gate thresholds
// ============================================================

const GLRS_GATE = {
  BUY_THRESHOLD: 55,
  SELL_THRESHOLD: 45,
} as const;

// ============================================================
// Signal determination
// ============================================================

function determineSignal(ics: number, glrsScore: number): ConvictionSignal {
  if (ics > 0.85 && glrsScore >= GLRS_GATE.BUY_THRESHOLD) return 'strong_buy';
  if (ics > 0.7 && glrsScore >= GLRS_GATE.BUY_THRESHOLD) return 'buy';
  if (ics < 0.15 && glrsScore <= GLRS_GATE.SELL_THRESHOLD) return 'strong_sell';
  if (ics < 0.3 && glrsScore <= GLRS_GATE.SELL_THRESHOLD) return 'sell';
  return 'hold';
}

// ============================================================
// Main ICS calculation
// ============================================================

export interface ICSInput {
  /** 7-Step analysis total score (0–10) */
  score7Step: number;
  /** MLIS overall score (0–100) or ML probability (0–1) */
  mlScore: number;
  /** Whether mlScore is already 0–1 or needs normalization from 0–100 */
  mlScoreIsNormalized?: boolean;
  /** Asset relative strength z-score (from FVR or custom) */
  assetRS: number;
  /** Current GLRS score (0–100) for gate checking */
  glrsScore: number;
  /**
   * Historical analysis outcomes for Platt calibration.
   * Each entry: { score: 0-100, outcome: 0 | 1 }
   * where 1 = TP hit, 0 = SL hit.
   *
   * When ≥30 outcomes are provided, the sigmoid parameters (A, B)
   * are fitted via gradient descent. Otherwise defaults are used.
   */
  historicalOutcomes?: TrainingOutcome[];
}

/**
 * Calculate the Instrument Conviction Score (ICS).
 *
 * Uses real Platt scaling calibration: sigmoid(A·score + B) where
 * A and B are fitted from historical TP/SL outcomes via gradient
 * descent (cross-entropy minimization).
 */
export function calculateICS(
  input: ICSInput,
  weights: { alpha: number; beta: number; gamma: number } = DEFAULT_ICS_WEIGHTS,
): ICSResult {
  // Normalize all inputs to [0, 1]
  const score7Step = clamp(input.score7Step / 10, 0, 1);

  const probML = input.mlScoreIsNormalized
    ? clamp(input.mlScore, 0, 1)
    : clamp(input.mlScore / 100, 0, 1);

  // RS z-score: map from roughly [-3, +3] to [0, 1]
  const rsAsset = clamp((input.assetRS + 3) / 6, 0, 1);

  // Raw ICS: weighted average
  const rawICS = weights.alpha * score7Step + weights.beta * probML + weights.gamma * rsAsset;

  // Calibrate using Platt scaling: sigmoid(A * rawScore + B)
  // rawICS is 0–1, but calibrateScore expects 0–100
  const plattResult = calibrateScore(rawICS * 100, input.historicalOutcomes);
  const calibratedConfidence = plattResult.calibratedProbability;

  // Gate check
  const glrsGateOpen = input.glrsScore >= GLRS_GATE.BUY_THRESHOLD ||
                       input.glrsScore <= GLRS_GATE.SELL_THRESHOLD;

  const signal = determineSignal(rawICS, input.glrsScore);

  return {
    score7Step: parseFloat(score7Step.toFixed(3)),
    probML: parseFloat(probML.toFixed(3)),
    rsAsset: parseFloat(rsAsset.toFixed(3)),
    rawICS: parseFloat(rawICS.toFixed(4)),
    calibratedConfidence: parseFloat(calibratedConfidence.toFixed(4)),
    signal,
    glrsGateOpen,
    glrsScore: input.glrsScore,
    weights,
  };
}

export function getDefaultICSWeights(): typeof DEFAULT_ICS_WEIGHTS {
  return { ...DEFAULT_ICS_WEIGHTS };
}
