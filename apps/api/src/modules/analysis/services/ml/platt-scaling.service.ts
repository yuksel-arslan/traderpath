/**
 * Platt Scaling Calibration Service
 * ===================================
 * Converts raw prediction scores into calibrated probabilities using
 * sigmoid (logistic) calibration:
 *
 *   P(success | score) = 1 / (1 + exp(A * score + B))
 *
 * Parameters A, B are fitted using gradient descent on historical
 * analysis outcomes (TP_HIT vs SL_HIT from the Analysis table).
 *
 * Methodology claim: "Platt scaling calibration layer for probability-
 * calibrated confidence outputs" (MLIS Layer 5)
 */

export interface PlattParams {
  A: number;  // slope (typically negative: higher score → higher probability)
  B: number;  // intercept
}

export interface PlattCalibrationResult {
  /** Calibrated probability of success (0-1) */
  calibratedProbability: number;
  /** Whether calibration is based on trained params or default */
  isCalibrated: boolean;
  /** Raw input score (0-100) */
  rawScore: number;
  /** Calibration confidence: how reliable the calibration itself is (0-1) */
  calibrationConfidence: number;
  /** Parameters used */
  params: PlattParams;
}

export interface TrainingOutcome {
  /** Raw analysis score (0-100) */
  score: number;
  /** Binary outcome: 1 = TP hit (success), 0 = SL hit (failure) */
  outcome: 0 | 1;
}

/**
 * Default Platt parameters (prior to training).
 * These provide a reasonable baseline mapping:
 *   score 50 → ~50% probability
 *   score 80 → ~73% probability
 *   score 30 → ~27% probability
 *
 * A = -0.05 (negative: higher score → higher probability)
 * B = 2.5   (shifts sigmoid to center around score 50)
 */
const DEFAULT_PARAMS: PlattParams = { A: -0.05, B: 2.5 };

/**
 * Minimum training samples required for reliable calibration.
 * Below this, default parameters are used.
 */
const MIN_TRAINING_SAMPLES = 30;

/**
 * Sigmoid function: 1 / (1 + exp(z))
 */
function sigmoid(z: number): number {
  // Numerical stability: clamp to prevent overflow
  if (z > 500) return 0;
  if (z < -500) return 1;
  return 1 / (1 + Math.exp(z));
}

/**
 * Compute cross-entropy loss for Platt parameters on training data.
 *
 * L = -Σ [y_i * log(p_i) + (1-y_i) * log(1-p_i)]
 *
 * where p_i = sigmoid(A * x_i + B)
 */
function crossEntropyLoss(data: TrainingOutcome[], params: PlattParams): number {
  let loss = 0;
  const eps = 1e-10; // prevent log(0)

  for (const { score, outcome } of data) {
    const p = sigmoid(params.A * score + params.B);
    const clampedP = Math.max(eps, Math.min(1 - eps, p));
    loss -= outcome * Math.log(clampedP) + (1 - outcome) * Math.log(1 - clampedP);
  }

  return loss / data.length;
}

/**
 * Fit Platt scaling parameters using gradient descent.
 *
 * Minimizes cross-entropy loss:
 *   ∂L/∂A = Σ (p_i - y_i) * x_i / N
 *   ∂L/∂B = Σ (p_i - y_i) / N
 *
 * @param data - Historical outcomes with scores
 * @param learningRate - Step size (default: 0.001)
 * @param maxIterations - Maximum gradient steps (default: 500)
 * @returns Fitted PlattParams
 */
export function fitPlattScaling(
  data: TrainingOutcome[],
  learningRate: number = 0.001,
  maxIterations: number = 500
): PlattParams {
  if (data.length < MIN_TRAINING_SAMPLES) {
    return { ...DEFAULT_PARAMS };
  }

  // Normalize scores to [0, 1] range for numerical stability
  const normalizedData = data.map(d => ({
    score: d.score / 100,
    outcome: d.outcome,
  }));

  // Initialize with default params (adjusted for normalized scale)
  let A = DEFAULT_PARAMS.A * 100; // Scale back since we normalized
  let B = DEFAULT_PARAMS.B;

  let prevLoss = Infinity;
  const convergenceThreshold = 1e-7;

  for (let iter = 0; iter < maxIterations; iter++) {
    let gradA = 0;
    let gradB = 0;

    for (const { score, outcome } of normalizedData) {
      const p = sigmoid(A * score + B);
      const error = p - outcome;
      gradA += error * score;
      gradB += error;
    }

    gradA /= normalizedData.length;
    gradB /= normalizedData.length;

    // Gradient descent step
    A -= learningRate * gradA;
    B -= learningRate * gradB;

    // Check convergence every 50 iterations
    if (iter % 50 === 0) {
      const loss = crossEntropyLoss(
        normalizedData.map(d => ({ score: d.score * 100, outcome: d.outcome })),
        { A: A / 100, B }
      );
      if (Math.abs(prevLoss - loss) < convergenceThreshold) break;
      prevLoss = loss;
    }
  }

  // Scale A back to original score range
  return { A: A / 100, B };
}

/**
 * Apply Platt scaling to convert a raw score into a calibrated probability.
 *
 * @param rawScore - Raw analysis score (0-100)
 * @param params - Platt parameters (fitted or default)
 * @returns Calibrated probability (0-1)
 */
export function applyPlattScaling(rawScore: number, params: PlattParams = DEFAULT_PARAMS): number {
  return sigmoid(params.A * rawScore + params.B);
}

/**
 * Full calibration pipeline: apply Platt scaling with metadata.
 *
 * @param rawScore - Raw MLIS composite score (0-100)
 * @param historicalOutcomes - Past analysis outcomes for training (optional)
 * @returns PlattCalibrationResult with calibrated probability and metadata
 */
export function calibrateScore(
  rawScore: number,
  historicalOutcomes?: TrainingOutcome[]
): PlattCalibrationResult {
  let params: PlattParams;
  let isCalibrated: boolean;
  let calibrationConfidence: number;

  if (historicalOutcomes && historicalOutcomes.length >= MIN_TRAINING_SAMPLES) {
    // Fit parameters on historical data
    params = fitPlattScaling(historicalOutcomes);
    isCalibrated = true;

    // Calibration confidence based on sample size
    // Starts at 0.5 for 30 samples, approaches 1.0 for 200+ samples
    calibrationConfidence = Math.min(1.0, 0.5 + (historicalOutcomes.length - 30) / 340);
  } else {
    // Use default parameters
    params = { ...DEFAULT_PARAMS };
    isCalibrated = false;
    calibrationConfidence = 0.3; // low confidence with default params
  }

  const calibratedProbability = applyPlattScaling(rawScore, params);

  return {
    calibratedProbability,
    isCalibrated,
    rawScore,
    calibrationConfidence,
    params,
  };
}

/**
 * Batch calibration for multiple scores using shared parameters.
 * More efficient than calling calibrateScore() repeatedly.
 */
export function batchCalibrateScores(
  rawScores: number[],
  historicalOutcomes?: TrainingOutcome[]
): PlattCalibrationResult[] {
  let params: PlattParams;
  let isCalibrated: boolean;
  let calibrationConfidence: number;

  if (historicalOutcomes && historicalOutcomes.length >= MIN_TRAINING_SAMPLES) {
    params = fitPlattScaling(historicalOutcomes);
    isCalibrated = true;
    calibrationConfidence = Math.min(1.0, 0.5 + (historicalOutcomes.length - 30) / 340);
  } else {
    params = { ...DEFAULT_PARAMS };
    isCalibrated = false;
    calibrationConfidence = 0.3;
  }

  return rawScores.map(rawScore => ({
    calibratedProbability: applyPlattScaling(rawScore, params),
    isCalibrated,
    rawScore,
    calibrationConfidence,
    params,
  }));
}
