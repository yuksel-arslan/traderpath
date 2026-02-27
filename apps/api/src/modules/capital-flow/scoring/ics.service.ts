/**
 * L4 — Instrument Conviction Score (ICS)
 *
 * Combines 7-Step Engine + MLIS Pro outputs into a single conviction score.
 *
 * Formula:
 *   ICS = α · Score_7Step + β · Prob_ML + γ · RS_asset
 *
 * Calibration:
 *   Confidence = IsotonicRegression(ICS)
 *
 * Trade Trigger:
 *   Buy  if ICS > 0.7 AND GLRS > 55
 *   Sell if ICS < 0.3 AND GLRS < 45
 *   Hold otherwise
 */

import type { ICSResult, ConvictionSignal } from './regime-score.types';
import { clamp } from './statistics';

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
  BUY_THRESHOLD: 55,   // GLRS must be >= 55 for buy signals
  SELL_THRESHOLD: 45,   // GLRS must be <= 45 for sell signals
} as const;

// ============================================================
// Isotonic regression approximation
// ============================================================

/**
 * Simplified isotonic regression for probability calibration.
 *
 * Maps raw ICS [0, 1] to calibrated confidence using a piecewise
 * linear function trained on typical score distributions.
 *
 * Breakpoints approximate an isotonic regression curve:
 *   ICS → Calibrated Confidence
 *   0.0 → 0.05  (very low conviction rarely succeeds)
 *   0.2 → 0.10
 *   0.3 → 0.20
 *   0.4 → 0.35
 *   0.5 → 0.50  (50/50 at midpoint)
 *   0.6 → 0.60
 *   0.7 → 0.72
 *   0.8 → 0.82
 *   0.9 → 0.90
 *   1.0 → 0.95  (capped — nothing is 100%)
 */
const CALIBRATION_BREAKPOINTS: [number, number][] = [
  [0.0, 0.05],
  [0.2, 0.10],
  [0.3, 0.20],
  [0.4, 0.35],
  [0.5, 0.50],
  [0.6, 0.60],
  [0.7, 0.72],
  [0.8, 0.82],
  [0.9, 0.90],
  [1.0, 0.95],
];

function isotonicCalibrate(rawICS: number): number {
  const clamped = clamp(rawICS, 0, 1);

  // Find the two breakpoints that bracket the input
  for (let i = 0; i < CALIBRATION_BREAKPOINTS.length - 1; i++) {
    const [x0, y0] = CALIBRATION_BREAKPOINTS[i];
    const [x1, y1] = CALIBRATION_BREAKPOINTS[i + 1];

    if (clamped >= x0 && clamped <= x1) {
      // Linear interpolation between breakpoints
      const t = (clamped - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }

  return clamped; // Fallback
}

// ============================================================
// Signal determination
// ============================================================

function determineSignal(
  ics: number,
  glrsScore: number,
): ConvictionSignal {
  // Strong buy: high ICS + risk-on environment
  if (ics > 0.85 && glrsScore >= GLRS_GATE.BUY_THRESHOLD) return 'strong_buy';
  if (ics > 0.7 && glrsScore >= GLRS_GATE.BUY_THRESHOLD) return 'buy';

  // Strong sell: low ICS + risk-off environment
  if (ics < 0.15 && glrsScore <= GLRS_GATE.SELL_THRESHOLD) return 'strong_sell';
  if (ics < 0.3 && glrsScore <= GLRS_GATE.SELL_THRESHOLD) return 'sell';

  return 'hold';
}

// ============================================================
// Main ICS calculation
// ============================================================

/**
 * Input for ICS calculation.
 */
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
}

/**
 * Calculate the Instrument Conviction Score (ICS).
 *
 * @param input   - Score components from 7-Step, MLIS, and asset RS
 * @param weights - Optional custom weights for α, β, γ
 * @returns ICSResult with raw ICS, calibrated confidence, and signal
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

  // Raw ICS
  const rawICS = weights.alpha * score7Step + weights.beta * probML + weights.gamma * rsAsset;

  // Calibrate
  const calibratedConfidence = isotonicCalibrate(rawICS);

  // Gate check
  const glrsGateOpen = input.glrsScore >= GLRS_GATE.BUY_THRESHOLD ||
                       input.glrsScore <= GLRS_GATE.SELL_THRESHOLD;

  // Signal
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

/**
 * Get the default ICS weights (useful for frontend display).
 */
export function getDefaultICSWeights(): typeof DEFAULT_ICS_WEIGHTS {
  return { ...DEFAULT_ICS_WEIGHTS };
}
