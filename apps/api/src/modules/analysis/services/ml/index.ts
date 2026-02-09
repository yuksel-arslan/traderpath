/**
 * ML Services Barrel Export
 * =========================
 * MLIS Pro neural inference layers:
 *   Layer 1: Conv1D Feature Extraction
 *   Layer 2: Regime-Adaptive Thresholds
 *   Layer 3: GARCH(1,1) Variance Modeling
 *   Layer 4: Institutional Flow Estimation (BVC + VPIN)
 *   Layer 5: Platt Scaling Calibration
 */

export { extractConv1DFeatures, type Conv1DFeatures, type KernelActivation } from './conv1d-features.service';
export { getAdaptiveThresholds, type AdaptiveThresholds, type VolatilityRegime } from './regime-thresholds.service';
export { analyzeGARCH, type GARCHResult, type GARCHParams } from './garch.service';
export { estimateInstitutionalFlow, type InstitutionalFlowResult } from './institutional-flow.service';
export { calibrateScore, applyPlattScaling, fitPlattScaling, type PlattCalibrationResult, type PlattParams, type TrainingOutcome } from './platt-scaling.service';
