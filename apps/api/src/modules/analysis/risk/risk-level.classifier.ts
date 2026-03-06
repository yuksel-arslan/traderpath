/**
 * RiskLevelClassifier (TASK 2.3)
 *
 * Extracts risk-level classification from analysis.engine.ts lines
 * 4237-4343 (safetyCheck) into a pure, testable module.
 *
 * Algorithm:
 *  Start at 100 (safest).
 *  Deduct points for each detected risk factor.
 *  Map final score to riskLevel:
 *    >= 75 → low
 *    >= 50 → medium
 *    >= 25 → high
 *    <  25 → critical
 */

import type {
  RiskLevelInput,
  RiskLevelResult,
  RiskLevel,
} from './risk-engine.interface';

export function classifyRiskLevel(input: RiskLevelInput): RiskLevelResult {
  let riskScore = 100;
  const warnings: string[] = [];

  // ── On-chain / order-book signals ─────────────────────────────────
  if (input.spoofingDetected) {
    riskScore -= 20;
    warnings.push('Spoofing detected in order book');
  }
  if (input.layeringDetected) {
    riskScore -= 15;
    warnings.push('Order book layering detected');
  }
  if (input.icebergDetected) {
    riskScore -= 10;
    warnings.push('Iceberg orders detected');
  }
  if (input.washTrading) {
    riskScore -= 15;
    warnings.push('Wash trading suspected');
  }

  // ── Pump & dump risk ──────────────────────────────────────────────
  if (input.pumpDumpRisk === 'high') {
    riskScore -= 25;
    warnings.push('High pump & dump risk');
  } else if (input.pumpDumpRisk === 'medium') {
    riskScore -= 10;
    warnings.push('Medium pump & dump risk');
  }

  // ── Volume anomalies ──────────────────────────────────────────────
  if (input.volumeRatio !== undefined && input.volumeRatio > 3) {
    riskScore -= 10;
    warnings.push(`Abnormal volume ratio (${input.volumeRatio.toFixed(1)}x)`);
  }
  if (input.volumeSpike) {
    riskScore -= 8;
    warnings.push('Volume spike detected');
  }

  // ── Price volatility ──────────────────────────────────────────────
  if (input.priceChange24h !== undefined && Math.abs(input.priceChange24h) > 15) {
    riskScore -= 10;
    warnings.push(`Large 24h price move (${input.priceChange24h.toFixed(1)}%)`);
  }

  // ── Liquidity ─────────────────────────────────────────────────────
  if (input.liquidityScore !== undefined && input.liquidityScore < 50) {
    riskScore -= 10;
    warnings.push(`Low liquidity score (${input.liquidityScore})`);
  }

  // ── Historical volatility ─────────────────────────────────────────
  if (input.historicalVolatility !== undefined && input.historicalVolatility > 100) {
    riskScore -= 5;
    warnings.push(`Extreme historical volatility (${input.historicalVolatility.toFixed(0)}%)`);
  }

  // ── News sentiment ────────────────────────────────────────────────
  if (input.newsSentiment === 'bearish') {
    riskScore -= 8;
    warnings.push('Negative news sentiment');
  }
  if (input.newsSentimentScore !== undefined && input.newsSentimentScore < -30) {
    riskScore -= 5;
    warnings.push(`Very negative sentiment score (${input.newsSentimentScore})`);
  }

  // ── Contract security (crypto-specific) ───────────────────────────
  if (input.isHoneypot) {
    riskScore -= 80; // Catastrophic: cannot sell token at all
    warnings.push('HONEYPOT DETECTED — cannot sell token');
  }
  if (input.isVerified === false) {
    riskScore -= 15;
    warnings.push('Contract not verified');
  }
  if (input.isMintable) {
    riskScore -= 20;
    warnings.push('Token is mintable — inflation risk');
  }
  if (input.liquidityLocked === false) {
    riskScore -= 15;
    warnings.push('Liquidity not locked — rug pull risk');
  }
  if (input.sellTax !== undefined && input.sellTax > 10) {
    riskScore -= 10;
    warnings.push(`High sell tax (${input.sellTax}%)`);
  }

  // ── Normalise ─────────────────────────────────────────────────────
  riskScore = Math.max(0, Math.min(100, riskScore));

  const riskLevel: RiskLevel =
    riskScore >= 75 ? 'low'      :
    riskScore >= 50 ? 'medium'   :
    riskScore >= 25 ? 'high'     : 'critical';

  // stepScore: 0-10 inverted (high riskScore → high stepScore)
  const stepScore = parseFloat(Math.max(1, Math.min(10, riskScore / 10)).toFixed(1));

  return { riskScore, stepScore, riskLevel, warnings };
}
